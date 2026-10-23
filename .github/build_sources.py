#!/usr/bin/env python3
"""Build data/sources.json from the Feed Integration agent's sources_v2.json (accepted = verified and not rejected).
Rules: drop RT; drop NCMEC AMBER (names/photos of private people). sourceClass is ownership/funding only:
state-funded/public/government media are forced to 'official' per Eyemont's class definition."""
import json, re, sys
V=json.load(open(sys.argv[1]))
CITY={'Anchorage':(61.22,-149.9),'Atlanta':(33.75,-84.39),'Austin':(30.27,-97.74),'Baltimore':(39.29,-76.61),'Berkeley':(37.87,-122.27),'Birmingham':(33.52,-86.81),'Boston':(42.36,-71.06),'Casper':(42.87,-106.31),'Chicago':(41.88,-87.63),'Cleveland':(41.5,-81.69),'Colorado Springs':(38.83,-104.82),'Columbus':(39.96,-83.0),'Denver':(39.74,-104.99),'Easton':(40.69,-75.22),'Fargo':(46.88,-96.79),'Grand Rapids':(42.96,-85.67),'Harrisburg':(40.27,-76.88),'Hartford':(41.76,-72.68),'Honolulu':(21.31,-157.86),'Houston':(29.76,-95.37),'Jackson':(32.3,-90.18),'Jacksonville':(30.33,-81.66),'Juneau':(58.3,-134.42),'Lansing':(42.73,-84.56),'Las Vegas':(36.17,-115.14),'Los Angeles':(34.05,-118.24),'Louisville':(38.25,-85.76),'Madison':(43.07,-89.4),'Melville':(40.79,-73.42),'Miami':(25.76,-80.19),'Minneapolis':(44.98,-93.27),'Montpelier':(44.26,-72.58),'Nashville':(36.16,-86.78),'New Orleans':(29.95,-90.07),'New York':(40.71,-74.01),'Newark':(40.74,-74.17),'Philadelphia':(39.95,-75.17),'Pittsburgh':(40.44,-80.0),'Portland|ME':(43.66,-70.26),'Portland|OR':(45.52,-122.68),'Reno':(39.53,-119.81),'Salt Lake City':(40.76,-111.89),'San Diego':(32.72,-117.16),'San Francisco':(37.77,-122.42),'Santa Cruz':(36.97,-122.03),'Santa Fe':(35.69,-105.94),'Springfield':(42.1,-72.59),'St. Paul':(44.95,-93.09),'St. Petersburg':(27.77,-82.64),'Staten Island':(40.58,-74.15),'Syracuse':(43.05,-76.15),'Tallahassee':(30.44,-84.28),'Toledo':(41.65,-83.54),'Tucson':(32.22,-110.97),'Washington':(38.9,-77.04),
 'London':(51.51,-0.13),'Berlin':(52.52,13.4),'Bonn':(50.74,7.1),'Paris':(48.86,2.35),'Doha':(25.29,51.53),'Toronto':(43.65,-79.38),'Sydney':(-33.87,151.21),'Geneva':(46.2,6.14),'Amsterdam':(52.37,4.9),'Kyiv':(50.45,30.52),'Riga':(56.95,24.11),'Prague':(50.08,14.44),'Beijing':(39.9,116.4),'Ankara':(39.93,32.86),'Jerusalem':(31.77,35.21),'Lyon':(45.76,4.84),'Sacramento':(38.58,-121.49),'Boise':(43.62,-116.2),'Ewa Beach':(21.32,-158.0),'Palmer':(61.6,-149.11),'Brussels':(50.85,4.35)}
HOME={'nyt':'New York','nyt_us':'New York','guardian':'London','abc':'New York','cbs':'New York','nbc':'New York','fox':'New York','npr':'Washington','pbs':'Washington','wsj':'New York','bloomberg':'New York','axios':'Washington','politico':'Washington','thehill':'Washington','upi':'Washington','afp_fr24':'Paris','skynews':'London','cnbc':'New York','latimes':'Los Angeles','abc_au':'Sydney','cbc':'Toronto','kyiv':'Kyiv','toi':'Jerusalem','voa':'Washington','rferl':'Prague','bbc':'London','dw':'Bonn','france24':'Paris','aljazeera':'Doha','cgtn':'Beijing','anadolu':'Ankara','rfa':'Washington','euronews':'Lyon','bellingcat':'Amsterdam','propublica':'New York','intercept':'New York','grayzone_skip':'Washington','warzone':'New York','occrp':'Amsterdam','meduza':'Riga','thecity':'New York','calmatters':'Sacramento','texastribune':'Austin','bleeping':'New York','krebs':'Washington','reliefweb':'Geneva','gdacs':'Geneva','cisa_adv':'Washington','nhc':'Miami','state_dept':'Washington','calOES':'Sacramento','inciweb':'Boise','fbi_news':'Washington','sfpd':'San Francisco','ptwc':'Ewa Beach','ntwc':'Palmer','lemmy_rss':'Amsterdam'}
CITY.update({k:tuple(v) for k,v in json.load(open('.github/us_cities.json')).items()})
feeds=[];homes={};dropped=[]
APPROVED={'aljazeera'}  # Evan approved 2026-10-23: headline + short summary only, credited 'Al Jazeera', link to aljazeera.com
CREDIT={'bbc':'BBC','aljazeera':'Al Jazeera'}
for x in V:
    if not x.get('verified') or (x.get('rejected') and x['id'] not in APPROVED): continue
    if not x['format'].startswith('rss'): continue
    if re.match(r'^rt\b|russia today',x['name'],re.I) or x['id'] in('rt','rt_news'): dropped.append({'name':x['name'],'why':'RT excluded'}); continue
    if x['id']=='amber_ncmec': dropped.append({'name':x['name'],'why':'names/photos of private people (events and places, never people)'}); continue
    city=x.get('homeCity') or HOME.get(x['id'])
    key=city if city in CITY else f"{city}|{x.get('homeState')}"
    if key not in CITY: dropped.append({'name':x['name'],'why':'no home city to place it'}); continue
    homes[city if city in CITY else key]=CITY[key]
    fund=x.get('fundingNote','');cls=x['sourceClass']
    if re.search(r'government|state[- ](funded|owned|run|media)|public broadcaster|intergovernmental',fund,re.I): cls='official'
    feeds.append({'id':x['id'],'name':CREDIT.get(x['id'],x['name']),'credit':x['id'] in CREDIT,'cls':cls,'url':x['url'],'home':city if city in CITY else key,'fund':fund,'cat':x['category']})
old=json.load(open('data/sources.json')) if False else None
json.dump({'_note':'sourceClass describes ownership/funding only, never truthfulness. Built by .github/build_sources.py from sources_v2.json (Feed Integration agent).','feeds':feeds,'homes':homes,'dropped':dropped},open('data/sources.json','w'),indent=0)
from collections import Counter;print(len(feeds),Counter(f['cls'] for f in feeds),dropped)
