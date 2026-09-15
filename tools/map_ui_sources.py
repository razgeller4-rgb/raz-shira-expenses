"""Read-only source scan. Values, user data and credentials are never exported."""
from pathlib import Path
import csv, re, hashlib, collections

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'design/specification'

def write(name,rows):
 with (OUT/name).open('w',encoding='utf-8-sig',newline='') as f:
  w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)

with (OUT/'FORM_FIELD_SPEC.csv').open(encoding='utf-8-sig') as f:
 forms=list({(r['form'],r['source_refs']) for r in csv.DictReader(f)})
rows=[];baselines=[]
for path in ['expense-app-v37-demo.html','expense-app-v37.html','payroll/index.html']:
 raw=(ROOT/path).read_bytes();source=raw.decode();sha=hashlib.sha256(raw).hexdigest()
 # Preserve character positions when excluding HTML comments; CSS is excluded by body start.
 clean=re.sub(r'<!--[\s\S]*?-->',lambda m:re.sub(r'[^\n]',' ',m.group()),source)
 body=re.search(r'<body\b',clean,re.I);begin=body.start() if body else 0
 funcs=list(re.finditer(r'^(?:async\s+)?function\s+(\w+)\s*\(',clean,re.M))
 scripts=[(m.start(),m.end()) for m in re.finditer(r'<script\b[^>]*>[\s\S]*?</script>',clean,re.I)]
 panels=list(re.finditer(r'<section[^>]*data-panel=["\']([^"\']+)',clean))
 for n,m in enumerate(re.finditer(r'<(input|select|textarea|button)\b[^>]*>',clean[begin:],re.I),1):
  pos=begin+m.start();tag=m.group();get=lambda a: (re.search(r'\b'+a+r'=["\']([^"\']*)',tag).group(1) if re.search(r'\b'+a+r'=["\']([^"\']*)',tag) else '')
  in_script=next(((a,b) for a,b in scripts if a<=pos<b),None)
  fn=next((f.group(1) for f in reversed(funcs) if in_script and in_script[0]<f.start()<pos),'static-markup')
  ident=get('id');acts=','.join(dict.fromkeys(re.findall(r'\b((?:update|toggle|show|open|save|delete|remove|render|add|confirm|clear|export|import|copy|close)\w*)\(',tag)))
  matches=[fid for fid,refs in forms if (ident and ident in refs.split(',')) or fn in refs.split(',') or any(a and a in refs.split(',') for a in acts.split(','))]
  panel=next((p.group(1) for p in reversed(panels) if p.start()<pos),'shell') if not in_script else 'dynamic'
  spec=','.join(sorted(set(matches)))
  coverage='mapped-form' if matches else 'semantic-review-required'
  if get('data-tab'):spec='C16';coverage='navigation-target-in-source';panel=get('data-tab')
  if ident in ['cloudSyncUrl','cloudSyncAnonKey','saveCloudSyncBtn']:spec='INTERNAL_CONFIG';coverage='hidden-internal-not-user-form'
  rows.append(dict(key=f'{path}:{n}',file=path,line=source.count('\n',0,pos)+1,tag=m.group(1),id=ident,type=get('type'),function=fn,panel_hint=panel,actions=acts,spec=spec or ('C14' if m.group(1)=='button' else 'C15'),coverage=coverage,source_sha256=sha))
 if (ROOT/path).read_bytes()!=raw:raise RuntimeError(f'{path} changed during scan; rerun before publishing inventory')
 baselines.append(dict(path=path,sha256=sha,lines=len(source.splitlines())))
write('SOURCE_UI_INVENTORY.csv',rows);write('SOURCE_BASELINE.csv',baselines)
summary={'total_occurrences':len(rows),'by_file':dict(collections.Counter(x['file'] for x in rows)),'coverage':dict(collections.Counter(x['coverage'] for x in rows))}
(OUT/'SCAN_NOTES.md').write_text('# גבולות מיפוי הפקדים\n\n'+str(summary)+'\n\nזהו סורק תגיות בקוד, לא AST של JavaScript ולא walkthrough חי. התוצאות כוללות תבניות HTML דינמיות וכפילויות דמו/ייצור. הערות HTML ו־CSS הוחרגו; תגיות בתוך הערות JavaScript עשויות לדרוש סינון ידני. panel_hint הוא רמז מיקום בלבד. רשומות semantic-review-required מחייבות שיוך עסקי לפני DESIGN_READY. כל שורה נושאת hash של המקור ומספר שורה המתאים לאותה גרסה בלבד. קוד עשוי להשתנות במקביל: לפני מימוש משווים hashes ומרעננים. אין ערכי שדות, סודות או נתוני משתמש בפלט.\n')
print(summary)
