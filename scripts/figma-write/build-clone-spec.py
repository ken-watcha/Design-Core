"""REST로 받은 프레임 JSON → 깊은 복제용 압축 스펙 (scripts/figma-write/deep-clone.md 1단계의 REST판).

사용법: python3 scripts/figma-write/build-clone-spec.py <nodes.json> <출력 prefix> [분할 기준 프레임 이름]
  - nodes.json: GET /v1/files/:key/nodes?ids=<프레임 id> 응답 (use_figma 결과 한도 20KB를 피하려고 REST로 받는다)
  - 출력: <prefix>-root.json (분할 기준 프레임의 자식을 뺀 전체) + <prefix>-part<N>.json (분할 기준 프레임의 자식들을 ~30KB 단위로)
  - 인스턴스는 안으로 내려가지 않고 key·속성·REST `overrides`(문자·채우기·표시·변형)만 적는다. 새 파일에서 id 접미사가 같으므로 경로 대신 접미사로 찾는다.
"""
import json, sys, os

src, prefix = sys.argv[1], sys.argv[2]
SPLIT = sys.argv[3] if len(sys.argv) > 3 else None
FULLSUB = set(os.environ.get('FULLSUB', '').split(',')) - {''}   # import도 브랜치 내 복제도 안 되는 키 → 하위 트리를 통째로 적는다
d = json.load(open(src)); nd = list(d['nodes'].values())[0]
doc, comps, sets = nd['document'], nd['components'], nd['componentSets']

def color(c, op=None):
    o = {'r': c['r'], 'g': c['g'], 'b': c['b']}
    a = c.get('a', 1.0) * (op if op is not None else 1.0)
    return o, a

def paint(p):
    t = p.get('type'); vis = p.get('visible', True)
    if t == 'SOLID':
        c, a = color(p['color'], p.get('opacity'))
        return {'type': 'SOLID', 'color': c, 'opacity': a, 'visible': vis}
    if t == 'IMAGE':
        return {'type': 'IMAGE', 'hash': p.get('imageRef'), 'scaleMode': p.get('scaleMode', 'FILL'), 'visible': vis, 'opacity': p.get('opacity', 1.0)}
    if t and t.startswith('GRADIENT'):
        return {'type': t, 'handles': p.get('gradientHandlePositions'), 'stops': [{'position': s['position'], 'color': s['color']} for s in p.get('gradientStops', [])], 'visible': vis, 'opacity': p.get('opacity', 1.0)}
    return None

def paints(arr):
    return [q for q in (paint(p) for p in (arr or [])) if q]

def rel(n):
    rt = n.get('relativeTransform')
    if rt: return round(rt[0][2], 2), round(rt[1][2], 2)
    return 0, 0

def common(n):
    x, y = rel(n); bb = n.get('absoluteBoundingBox') or {}
    o = {'n': n.get('name', ''), 'x': x, 'y': y, 'w': round(bb.get('width', 0), 2), 'h': round(bb.get('height', 0), 2)}
    if n.get('visible') is False: o['vis'] = False
    if n.get('opacity', 1) != 1: o['op'] = n['opacity']
    for k in ('layoutAlign', 'layoutGrow', 'layoutSizingHorizontal', 'layoutSizingVertical', 'layoutPositioning'):
        if k in n: o[k] = n[k]
    return o

def frame_like(n):
    o = common(n); o['t'] = 'F' if n['type'] != 'RECTANGLE' else 'R'
    o['fills'] = paints(n.get('fills'))
    if n.get('strokes'): o['strokes'] = paints(n['strokes']); o['sw'] = n.get('strokeWeight', 1); o['sa'] = n.get('strokeAlign', 'INSIDE')
    if 'cornerRadius' in n: o['radius'] = n['cornerRadius']
    if 'rectangleCornerRadii' in n: o['radii'] = n['rectangleCornerRadii']
    if n['type'] != 'RECTANGLE':
        o['clip'] = n.get('clipsContent', False)
        lm = n.get('layoutMode', 'NONE'); o['lm'] = lm
        if lm != 'NONE':
            for k in ('itemSpacing', 'counterAxisSpacing', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom',
                      'primaryAxisSizingMode', 'counterAxisSizingMode', 'primaryAxisAlignItems', 'counterAxisAlignItems', 'layoutWrap'):
                if k in n: o[k] = n[k]
    if n.get('effects'):
        o['effects'] = [e for e in n['effects'] if e.get('type') in ('DROP_SHADOW', 'INNER_SHADOW', 'LAYER_BLUR', 'BACKGROUND_BLUR')]
    return o

def text(n):
    o = common(n); o['t'] = 'T'; s = n.get('style', {})
    o['chars'] = n.get('characters', '')
    o['font'] = {'family': s.get('fontFamily'), 'style': s.get('fontStyle') or 'Regular'}
    o['size'] = s.get('fontSize'); o['ah'] = s.get('textAlignHorizontal', 'LEFT'); o['av'] = s.get('textAlignVertical', 'TOP')
    o['ar'] = s.get('textAutoResize', 'NONE')
    if s.get('lineHeightUnit') == 'PIXELS' and 'lineHeightPx' in s: o['lh'] = {'value': s['lineHeightPx'], 'unit': 'PIXELS'}
    elif s.get('lineHeightUnit') == 'FONT_SIZE_%' and 'lineHeightPercentFontSize' in s: o['lh'] = {'value': s['lineHeightPercentFontSize'], 'unit': 'PERCENT'}
    if s.get('letterSpacing'): o['ls'] = {'value': s['letterSpacing'], 'unit': 'PIXELS'}
    o['fills'] = paints(n.get('fills'))
    return o

def find_in(n, nid):
    if n['id'] == nid: return n
    for c in n.get('children', []):
        r = find_in(c, nid)
        if r: return r
    return None

def name_path(n, nid, acc=None):
    # 인스턴스 루트 n에서 nid까지의 [이름, 같은 이름 형제 중 순번] 경로. id 접미사가 안 맞을 때(라이브러리 버전 차이)의 대안
    acc = acc or []
    if n['id'] == nid: return acc
    seen = {}
    for c in n.get('children', []):
        k = seen.get(c.get('name', ''), 0); seen[c.get('name', '')] = k + 1
        r = name_path(c, nid, acc + [[c.get('name', ''), k]])
        if r is not None: return r
    return None

def props_of(n):
    out = {}
    for k, v in (n.get('componentProperties') or {}).items():
        t = v.get('type'); val = v.get('value')
        if t == 'INSTANCE_SWAP':
            key = comps.get(val, {}).get('key')
            if key: out[k] = {'swap': key}
        else:
            out[k] = val
    return out

def instance(n):
    o = common(n); o['t'] = 'I'
    c = comps.get(n.get('componentId'), {})
    o['key'] = c.get('key'); o['cname'] = c.get('name')
    if c.get('componentSetId'): o['setKey'] = sets.get(c['componentSetId'], {}).get('key')
    o['props'] = props_of(n)
    ov = []
    for e in n.get('overrides', []) or []:
        oid = e['id']; fields = e.get('overriddenFields', [])
        if oid == n['id']:
            continue
        if ';' not in oid: continue
        sub = find_in(n, oid)
        if not sub: continue
        suffix = oid.split(';', 1)[1]
        rec = {'s': suffix, 'p': name_path(n, oid)}
        if 'characters' in fields and sub.get('type') == 'TEXT': rec['text'] = sub.get('characters', '')
        if 'fills' in fields: rec['fills'] = paints(sub.get('fills'))
        if 'visible' in fields: rec['vis'] = sub.get('visible', True)
        if 'componentProperties' in fields and sub.get('type') == 'INSTANCE': rec['props'] = props_of(sub)
        if 'opacity' in fields: rec['op'] = sub.get('opacity', 1)
        if len(rec) > 2: ov.append(rec)
    if ov: o['ov'] = ov
    if o['key'] in FULLSUB:
        fl = frame_like(n); fl.pop('t', None); o.update({k: v for k, v in fl.items() if k not in o})
        o['sub'] = [b for b in (build_full(c) for c in n.get('children', [])) if b]
    return o

def build_full(n):
    # 인스턴스 하위 트리를 값이 박힌 그대로(오버라이드 포함) 일반 노드로 적는다. 중첩 인스턴스도 같은 방식.
    if n['type'] == 'INSTANCE':
        o = common(n); o['t'] = 'I'; c = comps.get(n.get('componentId'), {})
        o['key'] = c.get('key'); o['cname'] = c.get('name')
        if c.get('componentSetId'): o['setKey'] = sets.get(c['componentSetId'], {}).get('key')
        o['props'] = props_of(n)
        fl = frame_like(n); fl.pop('t', None); o.update({k: v for k, v in fl.items() if k not in o})
        o['sub'] = [b for b in (build_full(ch) for ch in n.get('children', [])) if b]
        o['forceSub'] = True   # 통째 재구성 안의 중첩 인스턴스는 import해도 내용(오버라이드)을 못 살리므로 REST 트리대로 일반 노드로 만든다
        return o
    return build(n, split_children=False)

def build(n, split_children=True):
    t = n['type']
    if t == 'INSTANCE': return instance(n)
    if t == 'TEXT': return text(n)
    if t in ('FRAME', 'GROUP', 'RECTANGLE', 'COMPONENT'):
        o = frame_like(n)
        if t == 'GROUP': o['group'] = True
        if t != 'RECTANGLE':
            if SPLIT and n.get('name') == SPLIT and split_children:
                o['split'] = True; o['children'] = []
            else:
                o['children'] = [b for b in (build(c) for c in n.get('children', [])) if b]
        return o
    if t in ('VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'REGULAR_POLYGON', 'ELLIPSE', 'LINE'):
        o = common(n); o['t'] = 'E' if t == 'ELLIPSE' else ('L' if t == 'LINE' else 'V')
        o['fills'] = paints(n.get('fills'))
        if n.get('strokes'): o['strokes'] = paints(n['strokes']); o['sw'] = n.get('strokeWeight', 1); o['sa'] = n.get('strokeAlign', 'CENTER')
        if o['t'] == 'V': o['paths'] = [{'windingRule': g.get('windingRule', 'NONZERO'), 'data': g.get('path', '')} for g in (n.get('fillGeometry') or [])]
        if o['t'] == 'V' and not o['paths'] and n.get('strokeGeometry'): o['paths'] = [{'windingRule': 'NONZERO', 'data': g.get('path', '')} for g in n['strokeGeometry']]; o['fills'] = o.get('strokes', []); o['strokes'] = []
        if n.get('cornerRadius') is not None: o['radius'] = n['cornerRadius']
        return o
    return {'t': 'X', 'n': n.get('name'), 'type': t, **common(n)}

root = build(doc, split_children=False)
LIMIT = int(os.environ.get('LIMIT', '28000'))
def size(o): return len(json.dumps(o, ensure_ascii=False, separators=(',', ':')))
jobs = []          # [{'parent': token, 'nodes': [...]}] — 만든 순서대로 실행
tok_n = [0]
def job_for(token):
    if jobs and jobs[-1]['parent'] == token and jobs[-1]['size'] < LIMIT: return jobs[-1]
    jobs.append({'parent': token, 'nodes': [], 'size': 0}); return jobs[-1]
def add(node, token):
    sz = size(node)
    kids_key = 'sub' if node.get('sub') else ('children' if node.get('children') else None)
    if sz <= LIMIT or not kids_key:
        j = job_for(token)
        if j['size'] + sz > LIMIT and j['nodes']: j = None; jobs.append({'parent': token, 'nodes': [], 'size': 0}); j = jobs[-1]
        j['nodes'].append(node); j['size'] += sz; return
    tok_n[0] += 1; t = 'T%d' % tok_n[0]
    kids = node[kids_key]; shell = {k: v for k, v in node.items() if k not in ('children', 'sub')}; shell['split'] = t; shell[kids_key] = []
    j = job_for(token); j['nodes'].append(shell); j['size'] += size(shell)
    for k in kids: add(k, t)
add(root, 'ROOT')
# 부모 토큰을 노드에 박고(_p) 순서대로 평탄화 → LIMIT 크기로만 나눈다. 토큰은 같은 호출 안(created)이나 이전 호출(TOKENS)에서 푼다
flat = []
for j in jobs:
    for n in j['nodes']: n['_p'] = j['parent']; flat.append(n)
jobs = []; cur, cs = [], 0
for n in flat:
    sz = size(n)
    if cur and cs + sz > LIMIT: jobs.append({'nodes': cur}); cur, cs = [], 0
    cur.append(n); cs += sz
if cur: jobs.append({'nodes': cur})
json.dump(jobs, open(f'{prefix}-jobs.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(prefix, 'jobs', len(jobs), [ (len(j['nodes']), size(j['nodes'])) for j in jobs ])
hashes = set()
def coll(o):
    if isinstance(o, dict):
        if o.get('type') == 'IMAGE' and o.get('hash'): hashes.add(o['hash'])
        for v in o.values(): coll(v)
    elif isinstance(o, list):
        for v in o: coll(v)
coll(jobs)
json.dump(sorted(hashes), open(f'{prefix}-hashes.json', 'w'))
print('image hashes referenced', len(hashes))
