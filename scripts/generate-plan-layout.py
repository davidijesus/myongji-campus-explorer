"""Reproduce the historical layout from preserved vector/tracing data.
Python 3 standard library only. Run with --check to compare without editing.
The input files are evidence-derived drawing coordinates, not a GPS survey.
"""
from pathlib import Path
import json,math,sys
root=Path(__file__).resolve().parent.parent
d=json.loads((root/'data/official-plan-footprints.json').read_text());groups={g['group']:g for g in d['groups']}
assign={'mju-y1':11,'mju-y2':14,'mju-y3':21,'mju-y8':23,'mju-y9':27,'mju-y10':24,'mju-y11':18,'mju-y13':34,'mju-y14':39,'mju-y15':36,'mju-y16':28,'mju-y17':29,'mju-y18':15,'mju-y19':33,'mju-y21':13,'mju-y22':5,'mju-y23':25,'mju-y24':41,'mju-y30':10,'mju-y31':2,'mju-y32':12,'mju-y33':7,'mju-y34':6,'mju-y35':8,'mju-y82':4,'mju-y83':35,'mju-e':38,'mju-bus-office':3,'mju-hydraulics':37,'mju-tennis-office':31,'mju-visitors':1,'mju-guardhouse':0}
records={}
for id,n in assign.items():
 g=groups[n];r=g['orientedRectanglePagePoints'];center=[sum(p[k] for p in r)/4 for k in range(2)]
 angle=-math.radians(g['longAxisDegreesClockwiseFromPageRight'])
 if angle < -math.pi/2:angle+=math.pi
 records[id]={'center':center,'size':[g['longSidePoints'],g['shortSidePoints']],'angle':angle,'method':'vector-envelope','groups':[n]}
splits=json.loads((root/'data/official-plan-complex-splits.json').read_text())
meshes={}
for r in splits['records']:
 id='mju-y-main' if r['code']=='Y_' else 'mju-'+r['code'].lower()
 angle=-math.radians(r['longAxisDegreesClockwiseFromPageRight'])
 if angle < -math.pi/2:angle+=math.pi
 records[id]={'center':r['rectangleCenterPagePoints'],'size':[r['longSidePoints'],r['shortSidePoints']],'angle':angle,'method':'complex-subdivision','groups':[r['sourceGroup']]}
 rings=[]
 for p in r['polygons']:rings.extend([p['exteriorPagePoints'],*p['interiorRingsPagePoints']])
 meshes[id]={'rings':rings,'triangles':r['roofTrianglesPagePoints']}
traces=json.loads((root/'data/official-plan-outdoors-roads.json').read_text())
for r in traces['features']:
 records['mju-'+r['code'].lower()]={'center':[v/2 for v in r['center']],'size':[v/2 for v in r['size']],'angle':r['angle'],'method':'manual-trace','groups':[]}
origin=records['mju-y3']['center']
header='''/** Relative layout traced from the university's historic site plan.\n * Displayed PDF points, x east/right and y south/down. This is a drawing frame,\n * NOT a georeferenced survey. The graphic bar calibrates both axes equally.\n * Rectangle envelopes simplify footprints; vertical architecture remains illustrative. */\nexport const PLAN_CALIBRATION = {\n    sourceUrl: 'https://www.mju.ac.kr/bbs/mjukr/147/116783/download.do',\n    documentDate: '2021-03-08', checkedAt: '2026-09-30',\n    pageSize: [1191,842],\n    scaleBar: { start: [985.5609130859375,658.700012], end: [1131.240966796875,658.700012], meters: 300 },\n    metersPerPoint: 300/(1131.240966796875-985.5609130859375), unitsPerMeter: .46,\n    originInPoints: ORIGIN,\n    // A single translation keeps the prior camera framing. It is not GPS registration.\n    originInScene: [75.3239124676365,5.1044296693199955], north: 'page-up',\n} as const;\nexport function planPointToReferencePoint(x:number,y:number): [number,number] {\n    const s=PLAN_CALIBRATION.metersPerPoint*PLAN_CALIBRATION.unitsPerMeter;\n    return [PLAN_CALIBRATION.originInScene[0]+(x-PLAN_CALIBRATION.originInPoints[0])*s,PLAN_CALIBRATION.originInScene[1]+(y-PLAN_CALIBRATION.originInPoints[1])*s];\n}\nexport interface PlanLayout {\n    center: [number,number]; size: [number,number]; angle:number;\n    method:'vector-envelope'|'manual-trace'|'complex-subdivision'; groups:number[];\n}\nexport const PLAN_LAYOUT: Record<string,PlanLayout> = DATA;\n'''.replace('ORIGIN',json.dumps(origin)).replace('DATA',json.dumps(records,ensure_ascii=False,indent=2))
header+='\n/** Absolute PDF-point source rings and constrained roof triangles. Shared seams are allocations, not surveyed hall boundaries. */\nexport const PLAN_COMPLEX_MESH: Record<string,{rings:[number,number][][];triangles:[number,number][][]}> = '+json.dumps(meshes,separators=(',',':'))+';\n'
header+='\n/** Manual context traces; no route or access information. */\nexport const PLAN_ROADS: [number,number][][] = '+json.dumps([[[v/2 for v in p] for p in r['pixels']] for r in traces['roads']],separators=(',',':'))+';\n'
target=root/'src/plan-layout.ts'
if '--check' in sys.argv:
    if target.read_text(encoding='utf-8') != header:
        raise SystemExit('Generated plan layout differs from committed source')
    print('Verified',len(records),'plan layout entries against preserved source data')
else:
    target.write_text(header,encoding='utf-8')
    print('Created',len(records),'plan layout entries; origin',origin)
