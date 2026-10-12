#!/usr/bin/env python3
"""Core 도우미 플러그인 학습 보고서 (Ken 보고용).

디자이너는 플러그인에서 학습 관련 UI를 보지 않는다. 플러그인은 "진행"마다 가설을 조용히
그 Figma 파일(문서 루트 sharedPluginData, namespace core-helper / key memory)에 저장한다.
이 스크립트가 그 파일들을 REST로 읽어 한 곳에 모으고, Ken이 승인/거절할 목록을 Markdown으로 만든다.
Ken의 결정은 --apply 로 plugin/memory.json 에 반영한다 → 모든 노트북의 플러그인이 켤 때 받아 간다.

  보고서:  python3 scripts/learning-report.py            → docs/learning-report.md (+ .map.json)
  결정:    python3 scripts/learning-report.py --apply "승인:1,2,5 거절:3 보류:4"
  파일 추가: plugin/report-sources.json 의 keys 에 파일 키를 넣는다 (core-index의 Core 파일은 자동)

토큰: 환경 변수 FIGMA_TOKEN 이 있으면 X-Figma-Token 헤더로, 없으면 프록시 주입에 맡긴다.
"""
import json, os, re, sys, urllib.request, urllib.error
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
NS, KEY = 'core-helper', 'memory'
TABLES = ['sections', 'sectionTokens', 'frameNames', 'frameTokens', 'judgeWords', 'kinds', 'rejected']


def empty():
    return {'v': 2, 'sections': {}, 'sectionTokens': {}, 'frameNames': {}, 'frameTokens': {}, 'judgeWords': {}, 'kinds': {}, 'rejected': {}, 'pending': [], 'history': [], 'count': 0, 'updatedAt': None}


# ---- 플러그인 code.js 와 같은 규칙 (tokens / bump / itemDelta / mergeMem) ----
def tokens(s):
    return [t for t in re.split(r'[^0-9a-z가-힣~]+', str(s or '').lower()) if len(t) >= 2]


def bump(o, k, v):
    o[k] = round((o.get(k, 0) + v) * 1000) / 1000


def bump2(o, k1, k2, v):
    o.setdefault(k1, {}); bump(o[k1], k2, v)


def item_delta(it, w=1.0):
    d = empty()
    k = it['kind']
    if k == 'section':
        d['sections'].setdefault(it['platform'], {}); bump2(d['sections'][it['platform']], it['name'].strip().lower(), it['cls'], w)
        d['sectionTokens'].setdefault(it['platform'], {})
        for t in tokens(it['name']): bump2(d['sectionTokens'][it['platform']], t, it['cls'], w)
    if k == 'frame':
        bump(d['frameNames'], it['name'].strip().lower(), w)
        for t in tokens(it['name']): bump(d['frameTokens'], t, 0.5 * w)
        for o in it.get('over', []):
            bump(d['frameNames'], o.strip().lower(), -0.5 * w)
            for t in tokens(o): bump(d['frameTokens'], t, -0.25 * w)
    if k == 'judge':
        for wd in it['words']: bump2(d['judgeWords'], wd, it['target'], w)
    if k == 'kind':
        bump2(d['kinds'], it['signature'], it['value'], w)
        d['sectionTokens']['__pages'] = {}
        for n in it['pageNames']:
            for t in tokens(n): bump2(d['sectionTokens']['__pages'], t, it['value'], w)
    return d


def deep_add(x, y):
    for k, v in y.items():
        if isinstance(v, (int, float)): bump(x, k, v)
        elif isinstance(v, dict): x.setdefault(k, {}); deep_add(x[k], v)


def decided(e):
    return len([i for i in e.get('items', []) if i.get('decision')])


def merge(a, b):
    if not b: return a
    for f in TABLES:
        a.setdefault(f, {}); deep_add(a[f], b.get(f) or {})
    by = {}
    for e in (a.get('pending') or []) + (b.get('pending') or []):
        if not e or not e.get('id'): continue
        cur = by.get(e['id'])
        if not cur or (e.get('rev', 0) > cur.get('rev', 0)) or (e.get('rev', 0) == cur.get('rev', 0) and (decided(e) > decided(cur) or (not cur.get('outcome') and e.get('outcome')))):
            by[e['id']] = e
    a['pending'] = sorted(by.values(), key=lambda e: e['date'])[-100:]
    hid = {h['id']: h for h in (a.get('history') or []) + (b.get('history') or []) if h and h.get('id')}
    a['history'] = sorted(hid.values(), key=lambda h: h['date'])[-60:]
    a['count'] = (a.get('count') or 0) + (b.get('count') or 0)
    if not a.get('updatedAt') or (b.get('updatedAt') and b['updatedAt'] > a['updatedAt']): a['updatedAt'] = b.get('updatedAt')
    return a


# ---- Figma 파일에서 기억 읽기 ----
def fetch_file_memory(key):
    req = urllib.request.Request(f'https://api.figma.com/v1/files/{key}?depth=1&plugin_data=shared')
    if os.environ.get('FIGMA_TOKEN'): req.add_header('X-Figma-Token', os.environ['FIGMA_TOKEN'])
    try:
        with urllib.request.urlopen(req, timeout=60) as r: d = json.load(r)
    except urllib.error.HTTPError as e:
        return None, f'HTTP {e.code} {e.read()[:120]!r}'
    except Exception as e:
        return None, str(e)
    spd = (d.get('document') or {}).get('sharedPluginData') or {}
    raw = (spd.get(NS) or {}).get(KEY)
    if not raw: return None, f'{d.get("name")}: 기억 없음'
    try: return json.loads(raw), d.get('name')
    except Exception as e: return None, f'{d.get("name")}: JSON 오류 {e}'


def source_keys():
    keys = []
    idx = json.load(open(P('core-index', 'core-index.json')))
    keys += [(f['name'], f['key']) for f in idx.get('files', []) if f.get('key')]
    src = P('plugin', 'report-sources.json')
    if os.path.exists(src):
        keys += [(k.get('name', '?'), k['key']) for k in json.load(open(src)).get('keys', [])]
    seen, out = set(), []
    for n, k in keys:
        if k not in seen: seen.add(k); out.append((n, k))
    return out


# ---- 채점표 ----
def scorecard(m):
    all_ = (m.get('history') or [])[-10:]
    h = [r for r in all_ if not r.get('careless')]
    s = lambda k: sum(r.get(k, 0) or 0 for r in h)
    picks, hit, fixed, fl, unsure = s('picks'), s('hit'), s('fixed'), s('fixedLearned'), s('unsure')
    pend = m.get('pending') or []
    items = sum(len(e['items']) for e in pend)
    appr = sum(1 for e in pend for i in e['items'] if i.get('decision') == 'approve')
    rej = sum(1 for e in pend for i in e['items'] if i.get('decision') == 'reject')
    conflicts = []
    for pf, tbl in (m.get('sections') or {}).items():
        for name, votes in tbl.items():
            if len(votes) > 1:
                v = sorted(votes.values(), reverse=True)
                if v[0] - v[1] < 1: conflicts.append(f'{pf} 섹션 "{name}" → ' + ' / '.join(f'{k} {x}' for k, x in votes.items()))
    for w, votes in (m.get('judgeWords') or {}).items():
        if len(votes) > 1:
            v = sorted(votes.values(), reverse=True)
            if v[0] - v[1] < 1: conflicts.append(f'낱말 "{w}" → ' + ' / '.join(votes.keys()))
    return dict(runs=len(h), careless=len(all_) - len(h), picks=picks, hit=hit, fixed=fixed, fixedLearned=fl, unsure=unsure, items=items, approved=appr, rejected=rej,
                kept=sum(1 for e in pend if e.get('outcome') == 'kept'), changed=sum(1 for e in pend if e.get('outcome') == 'changed'), conflicts=conflicts, total=m.get('count') or 0)


# ---- 보고서 ----
def build_report(m, sources_log):
    sc = scorecard(m)
    today = datetime.now(timezone.utc).astimezone().strftime('%Y-%m-%d %H:%M')
    lines = [f'# Core 도우미 학습 보고서 — {today}', '',
             '> Ken 보고용. 디자이너는 이 목록을 보지 않는다. 항목 번호로 결정을 적어 주면 `--apply`로 반영한다:',
             '> 예) `승인:1,2,5 거절:3 보류:4` — 적지 않은 항목은 그대로 대기.', '',
             '## 한눈에', '',
             f'- 승인된 기억 {sc["total"]}건 · 대기 가설 {sc["items"] - sc["approved"] - sc["rejected"]}건 (승인 {sc["approved"]} · 거절 {sc["rejected"]})',
             f'- 최근 살펴본 실행 {sc["runs"]}회: 제안 적중 {sc["hit"]}/{sc["picks"]} · 사람이 고침 {sc["fixed"]} (승인된 기억의 오답 {sc["fixedLearned"]}) · 확인 요청 {sc["unsure"]} · 빠른 진행 {sc["careless"]}회',
             f'- 만든 마스터: 유지 {sc["kept"]} · 바뀜 {sc["changed"]}',
             ]
    if sc['conflicts']:
        lines += ['- ⚠ 기억이 갈리는 항목:'] + [f'  - {c}' for c in sc['conflicts']]
    lines += ['', '## 읽은 파일', ''] + [f'- {l}' for l in sources_log] + ['', '## 검토할 가설', '']
    num, mp = 0, {}
    open_entries = [e for e in (m.get('pending') or []) if any(not i.get('decision') for i in e['items'])]
    if not open_entries: lines.append('_대기 중인 가설 없음_')
    for e in reversed(open_entries):
        tags = []
        if e.get('careless'): tags.append(f'⚠ 빠른 진행 {e.get("seconds", 0)}초')
        else: tags.append(f'{e.get("seconds", 0)}초 살펴봄')
        if e.get('outcome') == 'kept': tags.append('✓ 만든 마스터 유지됨')
        if e.get('outcome') == 'changed': tags.append('✗ 만든 마스터가 나중에 바뀜')
        mode = {'new': '새 Core', 'update': '기존 Core 업데이트', 'kind': '파일 종류'}.get(e.get('mode'), e.get('mode'))
        lines += [f'### {e.get("file")} — {e.get("date", "")[:10]} · {e.get("user")} · {mode} · ' + ' · '.join(tags), '', '| # | 항목 | 근거 | 이전 결정 |', '|---|---|---|---|']
        for it in e['items']:
            if it.get('decision'): continue
            num += 1; mp[str(num)] = {'entryId': e['id'], 'key': it['key']}
            prev = f'거절됨 {it["rejectedBefore"]}회' if it.get('rejectedBefore') else ''
            lines.append(f'| {num} | {it["text"]} | {it.get("note", "")} | {prev} |')
        lines.append('')
    lines += ['## 이미 결정된 것 (최근)', '']
    done = [(e, i) for e in (m.get('pending') or []) for i in e['items'] if i.get('decision')]
    for e, i in done[-30:]:
        lines.append(f'- {"승인" if i["decision"] == "approve" else "거절"} · {i["text"]} · {e.get("file")} · {i.get("decidedBy", "")} {i.get("decidedAt", "")[:10]}')
    if not done: lines.append('_없음_')
    return '\n'.join(lines) + '\n', mp


def apply_decisions(m, mp, spec):
    now = datetime.now(timezone.utc).isoformat()
    changed = 0
    for word, dec in (('승인', 'approve'), ('거절', 'reject'), ('보류', 'hold')):
        mt = re.search(word + r'\s*[:：]\s*([0-9,\s]+)', spec)
        if not mt: continue
        for n in [x.strip() for x in mt.group(1).split(',') if x.strip()]:
            ref = mp.get(n)
            if not ref: print(f'번호 {n} 없음'); continue
            e = next((x for x in m['pending'] if x['id'] == ref['entryId']), None)
            it = next((i for i in e['items'] if i['key'] == ref['key']), None) if e else None
            if not it: print(f'번호 {n}: 항목 못 찾음'); continue
            if dec == 'hold': continue
            it['decision'] = dec; it['decidedBy'] = 'Ken (보고서)'; it['decidedAt'] = now; e['rev'] = e.get('rev', 0) + 1
            if dec == 'approve':
                for f in TABLES: deep_add(m[f], item_delta(it)[f])
                m['count'] = (m.get('count') or 0) + 1
            else:
                bump(m['rejected'], it['key'], 1)
            changed += 1
    m['updatedAt'] = now
    return changed


def main():
    args = sys.argv[1:]
    mem_path, rep_path, map_path = P('plugin', 'memory.json'), P('docs', 'learning-report.md'), P('docs', 'learning-report.map.json')
    shared = json.load(open(mem_path)) if os.path.exists(mem_path) else empty()
    note = shared.pop('note', None)
    if args and args[0] == '--apply':
        mp = json.load(open(map_path))
        n = apply_decisions(shared, mp, ' '.join(args[1:]))
        if note: shared = {'v': shared['v'], 'note': note, **{k: v for k, v in shared.items() if k != 'v'}}
        json.dump(shared, open(mem_path, 'w'), ensure_ascii=False, indent=2); open(mem_path, 'a').write('\n')
        print(f'결정 {n}건 반영 → plugin/memory.json (커밋하면 모든 노트북에 적용)')
        return
    m = empty(); merge(m, shared)
    log = []
    for name, key in source_keys():
        mem, info = fetch_file_memory(key)
        if mem: merge(m, mem); log.append(f'{info} ({key}) — 가설 {len(mem.get("pending") or [])}묶음')
        else: log.append(f'{name} ({key}) — {info}')
    report, mp = build_report(m, log)
    open(rep_path, 'w').write(report); json.dump(mp, open(map_path, 'w'), ensure_ascii=False, indent=1)
    # 모은 대기 가설은 공유본에도 넣어 둔다 (결정은 --apply 에서)
    if note: m = {'v': m['v'], 'note': note, **{k: v for k, v in m.items() if k != 'v'}}
    json.dump(m, open(mem_path, 'w'), ensure_ascii=False, indent=2); open(mem_path, 'a').write('\n')
    print(report)


if __name__ == '__main__':
    main()
