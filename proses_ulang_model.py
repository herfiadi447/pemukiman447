# Jalankan melalui runpy.run_path(path_skrip) di konsol QGIS setelah membuka proyek versi 2.
# Ubah tabel/parameter.json dahulu. Berkas sumber asli berada di folder proyek.
# Hasil ditulis ke folder baru; tidak menimpa versi 2. Membuat ulang raster dan vektor
# per kecamatan beserta statistik dan sensitivitas; ekspor GeoJSON, peta dan ZIP masih terpisah.
from pathlib import Path
import json, time
import numpy as np
from scipy.ndimage import distance_transform_edt
from scipy.spatial import cKDTree
from osgeo import gdal, ogr
from qgis.core import QgsProject
import processing
P=Path(QgsProject.instance().homePath())
V=P/'luwu_versi_2'
p=json.loads((Path(__file__).resolve().parent/'tabel'/'parameter.json').read_text(encoding='utf-8'))
out=V/('hitung_ulang_'+time.strftime('%Y%m%d_%H%M%S'))
out.mkdir(parents=True, exist_ok=False)
d=gdal.Open(str(P/'Elevasi_Luwu_UTM_40_m_9ab7.tif')); nx,ny=d.RasterXSize,d.RasterYSize; gt=d.GetGeoTransform(); pr=d.GetProjection(); dem=d.ReadAsArray()
slope=gdal.Open(str(P/'Kemiringan_Luwu_persen_40_m_ae30.tif')).ReadAsArray()
def burn(path,touched=False,attribute_filter=None):
    m=gdal.GetDriverByName('MEM').Create('',nx,ny,1,gdal.GDT_Byte); m.SetGeoTransform(gt); m.SetProjection(pr)
    source=ogr.Open(str(path)); ly=source.GetLayer()
    if attribute_filter: ly.SetAttributeFilter(attribute_filter)
    gdal.RasterizeLayer(m,[1],ly,burn_values=[1],options=['ALL_TOUCHED=TRUE'] if touched else [])
    return m.ReadAsArray()
mask=burn(P/'Batas_Luwu_UTM_51S_0edf.gpkg')
road=burn(P/'Jalan_OSM_Luwu_UTM_dbe5.gpkg',attribute_filter="highway IN ("+','.join(chr(39)+x+chr(39) for x in p['road_types'])+")"); river=burn(P/'Sungai_OSM_Luwu_UTM_aefd.gpkg',attribute_filter="waterway IN ("+','.join(chr(39)+x+chr(39) for x in p['river_types'])+")"); buildings=burn(P/'Bangunan_Luwu_UTM_b1ff.gpkg',True)
dr=distance_transform_edt(road==0,sampling=40).astype('float32'); dw=distance_transform_edt(river==0,sampling=40).astype('float32')
bounds=[gt[0],gt[3]+gt[5]*ny,gt[0]+gt[1]*nx,gt[3]]
wc=gdal.Warp('',str(P/'luwu_sumber_WorldCover sekitar Luwu 2021 40 m.tif'),format='MEM',outputBounds=bounds,width=nx,height=ny,resampleAlg='near',dstSRS='EPSG:32751',dstNodata=0).ReadAsArray()
points=ogr.Open(str(V/'pusat_pendekatan.gpkg')); xy=np.array([[f.GetGeometryRef().GetX(),f.GetGeometryRef().GetY()] for f in points.GetLayer()]); tree=cKDTree(xy)
x=gt[0]+(np.arange(nx)+.5)*40; y=gt[3]-(np.arange(ny)+.5)*40; center=np.empty((ny,nx),np.float32)
for row in range(ny): center[row]=tree.query(np.column_stack([x,np.full(nx,y[row])]))[0]
def score(v,breaks,scores): return np.take(np.asarray(scores,dtype=np.uint8),np.searchsorted(breaks,v,side='right'))
sl=score(slope,p['slope_pct_breaks'],p['slope_scores']); sr=score(dr,p['road_m_breaks'],p['road_scores']); sc=score(center,p['center_m_breaks'],p['center_scores']); se=score(dem,p['elevation_m_breaks'],p['elevation_scores']); sw=score(dw,p['river_m_breaks'],p['river_scores']); w=p['weights_ahp']; total_w=sum(w.values()); assert total_w>0 and min(w.values())>=0; w={k:v/total_w for k,v in w.items()}
v=sl*w['lereng']+sr*w['jalan']+sc*w['pusat']+se*w['elevasi']+sw*w['sungai']
result=(4-np.searchsorted(p['result_breaks'],v,side='right')).astype('uint8')
result[(sl==0)|(se==0)|(sw==0)]=5; result[buildings==1]=10
for code in p['excluded_worldcover']: result[wc==code]={50:6,80:7,90:8,95:9}.get(code,11)
result[(slope<0)|(dem==-9999)|(wc==0)]=11; result[mask!=1]=0
combo=(result*2+((wc==p['agriculture_code'])&(result>0))).astype('uint8');combo[mask!=1]=0
r=out/'kelas_dan_pertanian.tif';ds=gdal.GetDriverByName('GTiff').Create(str(r),nx,ny,1,gdal.GDT_Byte,options=['COMPRESS=DEFLATE']);ds.SetGeoTransform(gt);ds.SetProjection(pr);ds.GetRasterBand(1).WriteArray(combo);ds.GetRasterBand(1).SetNoDataValue(0);ds=None
poly=str(out/'poligon.gpkg');diss=str(out/'dissolve.gpkg');inter=str(out/'per_kecamatan.gpkg')
processing.run('gdal:polygonize',{'INPUT':str(r),'BAND':1,'FIELD':'kode_gab','EIGHT_CONNECTEDNESS':False,'OUTPUT':poly})
processing.run('native:dissolve',{'INPUT':poly,'FIELD':['kode_gab'],'OUTPUT':diss})
processing.run('native:intersection',{'INPUT':str(P/'Kecamatan_Luwu_UTM_51S_e15f.gpkg'),'OVERLAY':diss,'INPUT_FIELDS':['adm3_name','adm3_pcode'],'OVERLAY_FIELDS':['kode_gab'],'OUTPUT':inter})
print('Hasil raster dan vektor belum disederhanakan:',out)
print('Menghitung tepi, statistik luas-sama dan sensitivitas ...')

# Sel pusat grid tidak menutup tepi administrasi. Poligonkan cakupan untuk menghitung sisa.
coverage=out/'cakupan.tif';ds=gdal.GetDriverByName('GTiff').Create(str(coverage),nx,ny,1,gdal.GDT_Byte,options=['COMPRESS=DEFLATE']);ds.SetGeoTransform(gt);ds.SetProjection(pr);ds.GetRasterBand(1).WriteArray((result>0).astype('uint8'));ds.GetRasterBand(1).SetNoDataValue(0);ds=None
coveragepoly=str(out/'cakupan.gpkg');edge=str(out/'tepi.gpkg')
processing.run('gdal:polygonize',{'INPUT':str(coverage),'BAND':1,'FIELD':'grid','EIGHT_CONNECTEDNESS':False,'OUTPUT':coveragepoly})
processing.run('native:difference',{'INPUT':str(P/'Kecamatan_Luwu_UTM_51S_e15f.gpkg'),'OVERLAY':coveragepoly,'OUTPUT':edge})
from pyproj import Transformer
from shapely import wkb
from shapely.ops import transform
from collections import defaultdict
import csv
laea='+proj=laea +lat_0=-3.16 +lon_0=120.15 +datum=WGS84 +units=m +no_defs'; trans=Transformer.from_crs('EPSG:32751',laea,always_xy=True)
def ha(g): return transform(trans.transform,wkb.loads(bytes(g.ExportToWkb()))).area/10000
areas={}; codes={}; ds=ogr.Open(str(P/'Kecamatan_Luwu_UTM_51S_e15f.gpkg'))
for f in ds.GetLayer():
    n=f.GetField('adm3_name'); areas[n]=ha(f.GetGeometryRef()); codes[n]=f.GetField('adm3_pcode')
ds=None
per=defaultdict(float)
for path,istepi in [(inter,False),(edge,True)]:
    ds=ogr.Open(path)
    for f in ds.GetLayer():
        k=12 if istepi else int(f.GetField('kode_gab'))//2;per[(f.GetField('adm3_name'),k)]+=ha(f.GetGeometryRef())
    ds=None
labels={1:'S1 sangat sesuai',2:'S2 sesuai',3:'S3 sesuai bersyarat',4:'N tidak sesuai',5:'Kendala',6:'Tidak dinilai'}
with (out/'statistik_kecamatan.csv').open('w',encoding='utf-8-sig',newline='') as fp:
    writer=csv.writer(fp);writer.writerow(['kecamatan','kode_kecamatan','kode_kelas','nama_kelas','luas_ha','persen_luas_kecamatan','persen_dari_dinilai','luas_kecamatan_ha','luas_dinilai_ha'])
    for n in sorted(areas):
        dinilai=sum(per[(n,k)] for k in range(1,5))
        for k in range(1,7):
            h=sum(per[(n,c)] for c in range(6,13)) if k==6 else per[(n,k)];writer.writerow([n,codes[n],k,labels[k],h,100*h/areas[n],100*h/dinilai if k<=4 and dinilai else '',areas[n],dinilai])
with (out/'komponen_tidak_dinilai.csv').open('w',encoding='utf-8-sig',newline='') as fp:
    writer=csv.writer(fp);writer.writerow(['kecamatan','kode_kecamatan','komponen','luas_ha','persen_kecamatan','persen_kabupaten'])
    for n in sorted(areas):
        for k,label in {6:'worldcover_50',7:'worldcover_80',8:'worldcover_90',9:'worldcover_95',10:'bangunan_selain_worldcover',11:'nodata_atau_kode_wc_tambahan',12:'tepi_grid'}.items():
            h=per[(n,k)];writer.writerow([n,codes[n],label,h,100*h/areas[n],100*h/sum(areas.values())])
# Dua belas skenario dipoligonkan bersama sehingga luas tiap perubahan dari vektor.
score_arrays=[sl,sr,sc,se,sw];keys=['lereng','jalan','pusat','elevasi','sungai'];ww=np.array([w[k] for k in keys]);eligible=(result>=1)&(result<=4);bits=np.zeros((ny,nx),dtype='uint16');scenarios=[]
for i,key in enumerate(keys):
    for label,factor in [('minus_10pct',.9),('plus_10pct',1.1)]:
        ws=ww.copy();ws[i]*=factor;ws/=ws.sum();val=sum(score_arrays[j]*ws[j] for j in range(5));changed=4-np.searchsorted(p['result_breaks'],val,side='right');bits|=((eligible&(changed!=result)).astype('uint16')<<len(scenarios));scenarios.append(key+'_'+label)
width=p['result_breaks'][1]-p['result_breaks'][0]
for label,shift in [('batas_minus_satu_interval',-width),('batas_plus_satu_interval',width)]:
    val=sum(score_arrays[j]*ww[j] for j in range(5));changed=4-np.searchsorted(np.asarray(p['result_breaks'])+shift,val,side='right');bits|=((eligible&(changed!=result)).astype('uint16')<<len(scenarios));scenarios.append(label)
bitfile=out/'sensitivitas_mask.tif';ds=gdal.GetDriverByName('GTiff').Create(str(bitfile),nx,ny,1,gdal.GDT_UInt16,options=['COMPRESS=DEFLATE']);ds.SetGeoTransform(gt);ds.SetProjection(pr);ds.GetRasterBand(1).WriteArray(bits);ds.GetRasterBand(1).SetNoDataValue(0);ds=None
if np.any(bits):
    polychange=str(out/'sensitivitas_poligon.gpkg');clipchange=str(out/'sensitivitas_kecamatan.gpkg')
    processing.run('gdal:polygonize',{'INPUT':str(bitfile),'BAND':1,'FIELD':'mask','EIGHT_CONNECTEDNESS':False,'OUTPUT':polychange})
    processing.run('native:intersection',{'INPUT':polychange,'OVERLAY':str(P/'Kecamatan_Luwu_UTM_51S_e15f.gpkg'),'INPUT_FIELDS':['mask'],'OVERLAY_FIELDS':['adm3_name'],'OUTPUT':clipchange})
    ds=ogr.Open(clipchange);counts=defaultdict(float)
    for f in ds.GetLayer():
        b=f.GetField('mask');n=f.GetField('adm3_name');area=ha(f.GetGeometryRef())
        for j in range(len(scenarios)):
            if b & (1<<j): counts[(n,j)]+=area
    ds=None
else: counts=defaultdict(float)
with (out/'sensitivitas.csv').open('w',encoding='utf-8-sig',newline='') as fp:
    writer=csv.writer(fp);writer.writerow(['skenario','kecamatan','luas_berpindah_ha','luas_dinilai_ha','persen_luas_dinilai_berpindah','persen_luas_kecamatan_berpindah'])
    for j,label in enumerate(scenarios):
        for n in sorted(areas):
            denom=sum(per[(n,k)] for k in range(1,5));h=counts[(n,j)];writer.writerow([label,n,h,denom,100*h/denom if denom else 0,100*h/areas[n]])
        denom=sum(per[(n,k)] for n in areas for k in range(1,5));h=sum(counts[(n,j)] for n in areas);writer.writerow([label,'SELURUH KABUPATEN',h,denom,100*h/denom if denom else 0,100*h/sum(areas.values())])
sumarea=sum(per.values());boundary=sum(areas.values());print('Jumlah kelas dan tepi',sumarea,'ha; batas kecamatan',boundary,'ha; beda',sumarea-boundary,'ha')
print('Keluaran statistik_kecamatan.csv, komponen_tidak_dinilai.csv dan sensitivitas.csv:',out)
print('Ekspor GeoJSON, peta, SHP dan ZIP belum dijalankan otomatis.')
