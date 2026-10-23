#!/usr/bin/env python3
"""data/dispatch.json: per-dataset field mapping for city open-data 911/dispatch feeds from sources_v2.json (browser-direct, CORS).
Privacy: never show addresses/narratives; coords rounded to ~1 km in the client; sensitive call types dropped."""
import json,re,sys
V={x['id']:x for x in json.load(open(sys.argv[1])) if x.get('verified') and not x.get('rejected')}
M={# id: (city, citylat, citylon, timefield(s), typefield, latf, lonf | pointfield)
'911_sea911':('Seattle Fire',47.61,-122.33,'datetime','type','latitude','longitude'),
'911_sea_spd':('Seattle Police',47.61,-122.33,'cad_event_original_time_queued','final_call_type','dispatch_latitude','dispatch_longitude'),
'911_sf_dispatch':('San Francisco',37.77,-122.42,'received_datetime','call_type_final_desc',None,None),
'911_sf_fire':('San Francisco Fire',37.77,-122.42,'received_dttm','call_type','@case_location',None),
'911_dallas':('Dallas',32.78,-96.80,'date+time','nature_of_call',None,None),
'911_nola':('New Orleans',29.95,-90.07,'timecreate','typetext','@location',None),
'911_montgomery':('Montgomery County MD',39.14,-77.2,'start_time','initial_type','latitude','longitude'),
'911_cincy':('Cincinnati Police',39.1,-84.51,'calldatetime','problemtypedescription','lat_x','lon_x'),
'911_cincy_fire':('Cincinnati Fire',39.1,-84.51,'create_time_incident','incident_type_desc','latitude_x','longitude_x'),
'911_everett':('Everett Fire',47.98,-122.2,'startdatetime','finaltypedescription','@geomcoordinate',None),
'911_everett_pd':('Everett Police',47.98,-122.2,'datetimereceived','incidenttype',None,None),
'911_kcmo':('Kansas City MO',39.1,-94.58,'incident_date','type_description',None,None),
'911_sonoma':('Sonoma County',38.44,-122.71,'date_time','nature_description','location.latitude','location.longitude'),
'911_austin_fire':('Austin (fire)',30.27,-97.74,'published_date','issue_reported','latitude','longitude'),
'911_austin_traffic':('Austin (traffic)',30.27,-97.74,'published_date','issue_reported','latitude','longitude'),
'911_rockford':('Rockford IL',42.27,-89.09,'dispatch_date_time','incident_type_desc_display',None,None),
'911_winnebago':('Winnebago County IL',42.33,-89.16,'dispatch_date_time','incident_type_desc_display',None,None),
'911_gainesville':('Gainesville FL',29.65,-82.32,'report_date','narrative','latitude','longitude'),
'911_honolulu':('Honolulu',21.31,-157.86,'date','type',None,None),
'911_pgcounty':("Prince George's County MD",38.83,-76.85,'date','clearance_code_inc_type','latitude','longitude'),
'911_somerville':('Somerville MA',42.39,-71.1,None,'inctype',None,None),
'911_batonrouge':('Baton Rouge',30.45,-91.15,'disp_date+disp_time','inci_descript',None,None),
'911_cambridge':('Cambridge MA',42.37,-71.11,'datetimereceived','type',None,None),
'911_la':('Los Angeles',34.05,-118.24,'dispatch_date+dispatch_time','call_type_text',None,None),
'911_richmond_ca':('Richmond CA',37.94,-122.35,'createddateutc','secondaryeventtype',None,None)}
out=[];skip=[]
for k,x in V.items():
    if x['category']!='911-dispatch': continue
    if k not in M: skip.append({'id':k,'name':x['name'],'why':'historical/aggregate-only or not fetchable (no live per-call rows)'}); continue
    c=M[k]; t=c[3]; lic=re.search(r'licence per metadata read [^:]*:\s*([^;]+)',x.get('termsNote',''))
    host=re.match(r'https://([^/]+)',x['url']).group(1)
    base=x['url'].split('?')[0]
    order=(t.split('+')[0]+' DESC'+(','+t.split('+')[1]+' DESC' if '+' in t else '')) if t else (':id DESC' if k!='911_somerville' else 'incnum DESC')
    out.append({'id':k,'city':c[0],'lat':c[1],'lon':c[2],'time':t,'type':c[4],'latf':c[5],'lonf':c[6],'url':base,'order':order,'portal':'https://'+host,'license':(lic.group(1).strip() if lic else 'see portal'),'name':x['name']})
json.dump({'datasets':out,'skipped':skip},open('.github/dispatch.json','w'),indent=0)
print(len(out),'datasets;',[s['id'] for s in skip])
