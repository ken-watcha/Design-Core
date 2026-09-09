"""Core 파일의 마스터·플로우 페이지를 REST로 통째로 받아 .cache/core-dump/ 에 저장한다 (읽기 전용).

사용법: python3 scripts/figma-rest/dump-core-file.py [라벨 ...]     # 라벨 생략 시 core-files.json의 전부
  - 대상 목록: scripts/figma-rest/core-files.json (라벨 → key·name·pages). 새 Core가 생기면 여기에 추가.
  - 출력: .cache/core-dump/raw-<라벨>-master.json, raw-<라벨>-flow.json, parsed-<라벨>.json
  - 마스터 페이지는 깊이 제한 없이(수십 MB), 플로우 페이지는 depth=4로 받는다. 11개 파일에 약 3분.
  - 다음 단계: python3 scripts/figma-rest/build-index-entries.py → .cache/core-dump/new-entries.json → core-index.json에 합치기
"""
import json, urllib.request, sys, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SP = os.path.join(ROOT, ".cache", "core-dump"); os.makedirs(SP, exist_ok=True)
files = json.load(open(f"{HERE}/core-files.json"))
ONLY = [a for a in sys.argv[1:] if not a.startswith("-")]
def get(url):
    with urllib.request.urlopen(urllib.request.Request(url), timeout=180) as r:
        return json.load(r)

def walk(n, d, out, maxd, keep_types=('SECTION','FRAME','INSTANCE','COMPONENT','GROUP')):
    if d > maxd: return
    t = n.get('type')
    bb = n.get('absoluteBoundingBox') or {}
    rec = {'d': d, 'id': n['id'], 't': t[0] if t else '?', 'name': n.get('name'), 'w': round(bb.get('width',0)), 'h': round(bb.get('height',0)), 'x': round(bb.get('x',0)), 'y': round(bb.get('y',0)), 'c': len(n.get('children',[]))}
    if t == 'INSTANCE':
        cp = n.get('componentProperties') or {}
        rec['props'] = {k.split('#')[0]: v.get('value') for k, v in cp.items()}
        texts = []
        def tx(m):
            if m.get('type') == 'TEXT': texts.append(m.get('characters','')[:100])
            for ch in m.get('children', []): tx(ch)
        tx(n); rec['texts'] = texts[:6]
    if t in keep_types: out.append(rec)
    if t == 'SECTION' or (t == 'FRAME' and d <= 1) or (d == 0):
        for ch in n.get('children', []): walk(ch, d+1, out, maxd)
    elif t == 'FRAME' and n.get('name','').startswith('📎'):
        for ch in n.get('children', []): walk(ch, d+1, out, maxd)

def links(n, acc, path=''):
    if n.get('type') == 'TEXT':
        hl = n.get('hyperlink')
        if hl: acc.append({'id': n['id'], 'chars': n.get('characters','')[:60], 'url': hl.get('url') or hl.get('nodeID')})
        for seg in (n.get('characterStyleOverrides') or []): pass
        st = n.get('styleOverrideTable') or {}
        for k, v in st.items():
            if v.get('hyperlink'): acc.append({'id': n['id'], 'chars': n.get('characters','')[:60], 'url': v['hyperlink'].get('url') or v['hyperlink'].get('nodeID')})
    for ch in n.get('children', []): links(ch, acc)

for label, f in files.items():
    if ONLY and label not in ONLY: continue
    key = f['key']
    master = [p for p in f['pages'] if '마스터' in p[1]][0][0]
    flow = [p for p in f['pages'] if '플로우' in p[1]][0][0]
    res = {'label': label, 'key': key, 'name': f['name']}
    for role, pid, depth in (('master', master, None), ('flow', flow, 4)):
        url = f"https://api.figma.com/v1/files/{key}/nodes?ids={pid}" + (f"&depth={depth}" if depth else "")
        try:
            d = get(url)
        except Exception as e:
            res[role] = {'error': str(e)[:200]}; continue
        node = d['nodes'][pid]['document']
        raw = f"{SP}/raw-{label.replace(chr(47),chr(95))}-{role}.json"
        json.dump(node, open(raw,'w'), ensure_ascii=False)
        out = []; walk(node, 0, out, 5 if role=='master' else 2)
        acc = []; links(node, acc)
        res[role] = {'page': pid, 'rows': out, 'links': acc, 'size': os.path.getsize(raw)}
    json.dump(res, open(f"{SP}/parsed-{label.replace(chr(47),chr(95))}.json",'w'), ensure_ascii=False, indent=1)
    print(label, {r: (v.get('error') or (len(v['rows']), len(v['links']), v['size'])) for r, v in res.items() if isinstance(v, dict)})
