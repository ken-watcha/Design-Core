"""dump-core-file.py가 저장한 raw-*-master.json / raw-*-flow.json → core-index.json 항목(master.roots 구조) 생성.

사용법: python3 scripts/figma-rest/build-index-entries.py [라벨 ...]   # 생략 시 ORDER 전부
  - 출력: .cache/core-dump/new-entries.json (core-index.json의 files[]에 넣을 항목 목록)
  - 묶음(⚪)·크기(🔵) 배정은 설명 바의 위치(프레임 중심 x가 라벨 폭 안, 바로 위) 기준 자동 → 라벨이 프레임보다 좁으면 빈칸이 생길 수 있음. 실물 확인 필요.
  - 링크 카드 = 높이 200 이하·폭 500 이하 프레임 중 하이퍼링크(styleOverrideTable 포함)가 있는 것.
  - DOMAIN 사전(다루는 영역·메모)은 사람이 쓴다. 새 파일을 추가하면 여기에 항목을 넣는다.
"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SP = os.path.join(ROOT, ".cache", "core-dump")
files = json.load(open(f"{HERE}/core-files.json"))
COL = {'⚫️ 어두운 회색':'black','⚪️ 밝은 회색':'white','🔵 파랑':'blue'}
ORDER = ['왓챠파티','결제/구독','웹툰','TV','콘상페','플레이어','TVOD','검색','보관함','나의 왓챠','프로필']
order = [a for a in sys.argv[1:] if not a.startswith('-')] or ORDER
safe = lambda l: l.replace('/','_')
SKIP_ENTRY = ('스크린 설명 컴포넌트','플로우 화살','영역 설명 컴포넌트')

DOMAIN = {
 '왓챠파티': (["왓챠파티 페이지(파티 목록·상세·절망편)", "왓챠파티 생성(공개/비공개)", "왓챠파티 바텀시트", "왓챠파티 플레이어(세로/가로)"], "새 Core 케이스의 본보기 — 홈·TVOD·플레이어 등 여러 영역을 가로지르는 기능이라 별도 Core로 분리. 마스터에 '왓챠파티 진입' 섹션(어느 Core의 어느 화면에서 들어오는지 표시)이 있음"),
 '결제/구독': (["결제 페이지(콘텐츠 결제·웹툰 결제·선물하기)", "구독(이용권 결제)"], "한 파일에 루트 섹션 2개(🌏 결제 / 🌏 구독) + 플로우 루트 2개(🌊 플로우_결제 / 🌊 플로우_구독). 링크 카드 3개(결제·선물하기·구독)가 각각 다른 기준 문서를 가리킴"),
 '웹툰': (["웹툰 탭 홈(APP small/medium/large, WEB small/large)", "웹툰 뷰어(플로우 페이지에만)"], "루트 섹션 없이 APP/WEB 섹션이 페이지에 바로 놓임. 케이스 묶음(⚪) 없이 파일 바(⚫)+크기 바(🔵)만. 플로우 페이지 밖에 '웹툰 뷰어' 프레임"),
 'TV': (["TV 홈(점보트론·TVOD 랭킹)", "TV 에피소드 리스트", "TV 레이아웃 템플릿"], "TV 플랫폼 전용. 새 형식 미적용 — 섹션·설명 바 없이 1920 프레임 4장만, 플로우 페이지는 비어 있음"),
 '콘상페': (["콘텐츠 상세 페이지(콘텐츠 정보·회차 정보·관련 콘텐츠·웹툰 탭)", "케이스 표(시즌/버전·탑 네비게이션·예상 별점·갯수별 노출·버튼)"], "마스터에 '콘상페 진입' 섹션(SVOD·TVOD·웹툰·보관함·검색에서의 진입점 표시). WEB은 large를 ~1079 / 1080~ 두 폭으로 나눔"),
 '플레이어': (["일반 플레이어(모바일·태블릿·웹)", "왓챠파티 플레이어(세로/가로)"], "마스터에 '플레이어 진입' 섹션. 링크 카드 2개(모바일 플레이어 / 웹 플레이어)가 각각 다른 기준 문서를 가리킴. 왓챠파티 플레이어는 [Core] 왓챠파티에도 있음 → 이중 수록 주의"),
 'TVOD': (["TVOD 홈(로그인/구독 케이스)", "태그 페이지(일반 태그·성인 태그 ×인증 상태)"], "SVOD와 같은 홈 구조. 태그 페이지가 여기에 수록됨"),
 '검색': (["검색 전", "검색 시도", "검색 결과"], ""),
 '보관함': (["보관함 메인(콘텐츠/리스트)", "보고싶어요·시청 콘텐츠·다운로드·구매 콘텐츠·선물함·평가하기 상세", "일반/키즈 프로필 × empty/error state"], "마스터 화면 수가 가장 많음(APP 105·WEB 72). 대분류(⚫)가 일반 프로필/키즈 프로필/empty state/error case로 갈라지고 그 아래 화면 묶음. 자동 묶음이라 라벨 배치가 어긋난 곳이 있을 수 있음 — 이관 전 실물 확인"),
 '나의 왓챠': (["나의 왓챠(구독·비구독·비로그인)"], "설정 하위 화면(계정·재생·알림 등)은 플로우 페이지에만"),
 '프로필': (["프로필 선택·생성·수정·잠금"], ""),
}

def find(n, nid):
    if n['id'] == nid: return n
    for c in n.get('children', []):
        r = find(c, nid)
        if r: return r

def bb(n):
    b = n.get('absoluteBoundingBox') or {}
    return round(b.get('x', 0)), round(b.get('y', 0)), round(b.get('width', 0)), round(b.get('height', 0))

def hyperlinks(n, acc):
    if n.get('type') == 'TEXT':
        hls = ([n['hyperlink']] if n.get('hyperlink') else []) + [v['hyperlink'] for v in (n.get('styleOverrideTable') or {}).values() if v.get('hyperlink')]
        for h in hls: acc.append((n.get('characters', ''), h.get('url') or h.get('nodeID')))
    for c in n.get('children', []): hyperlinks(c, acc)
    return acc

def texts(n, acc):
    if n.get('type') == 'TEXT': acc.append(n)
    for c in n.get('children', []): texts(c, acc)
    return acc

def label_title(inst):
    ts = [t for t in texts(inst, []) if t.get('visible', True) and t.get('characters', '').strip() and t['characters'] not in ('✨',)]
    # 스크린 설명 컴포넌트: 첫 visible 텍스트가 '제목'(placeholder)일 때가 있어 그 다음 것을 취함
    for t in ts:
        c = t['characters'].strip()
        if c in ('제목', 'Title', '설명 컴포넌트\n설명 컴포넌트', '이번 달 캘린더를 아직 못 채운 상황'): continue
        return c[:80]
    return ts[0]['characters'][:80] if ts else '?'

def sec_style(node):
    f = (node.get('fills') or [{}])[0].get('color')
    return {'fill': f"{round(f['r']*255)},{round(f['g']*255)},{round(f['b']*255)}" if f else None, 'radius': node.get('cornerRadius')}

def nearest_above(labels, fx, fy, fw):
    cx = fx + fw / 2; best = None
    for l in labels:
        if l['x'] - 8 <= cx <= l['x'] + l['w'] + 8 and l['y'] <= fy:
            if best is None or l['y'] > best['y']: best = l
    return best

def is_card(n):
    x, y, w, h = bb(n)
    return n['type'] == 'FRAME' and h <= 200 and w <= 500 and bool(hyperlinks(n, []))

def card_entry(n, section=None):
    ts = [t['characters'] for t in texts(n, []) if t.get('visible', True)]
    hl = hyperlinks(n, [])
    return {'id': n['id'], 'name': n['name'], **({'section': section} if section else {}), 'link_to': hl[0][1] if hl else None, 'link_text': hl[0][0] if hl else None,
            'texts': [t for t in ts if t not in ('🔗',)][:3], 'has_base_info': False, 'form': "제목 + 안내문 + 'ㄴ 상태 뱃지' 인스턴스(🔗 관련 스펙 링크 하이퍼링크) — 소식함 카드와 같은 형태"}

def build_section(s):
    kids = s.get('children', [])
    labels, others, frames, cards = [], [], [], []
    for k in kids:
        x, y, w, h = bb(k)
        if k['type'] == 'INSTANCE' and (k.get('componentProperties') or {}).get('배경 색상'):
            labels.append({'id': k['id'], 'x': x, 'y': y, 'w': w, 'title': label_title(k), 'col': COL.get(k['componentProperties']['배경 색상']['value'])})
        elif k['type'] == 'INSTANCE': others.append(k['name'])
        elif k['type'] in ('FRAME', 'GROUP', 'COMPONENT'):
            if is_card(k): cards.append(card_entry(k, s['name']))
            else: frames.append({'id': k['id'], 'name': k['name'], 'x': x, 'y': y, 'w': w, 'h': h})
    black = [l for l in labels if l['col'] == 'black']; white = [l for l in labels if l['col'] == 'white']; blue = [l for l in labels if l['col'] == 'blue']
    use_black = len(black) > 1
    groups = {}
    for fr in frames:
        w_ = nearest_above(white, fr['x'], fr['y'], fr['w']); b = nearest_above(black, fr['x'], fr['y'], fr['w']); z = nearest_above(blue, fr['x'], fr['y'], fr['w'])
        scr = {'id': fr['id'], 'name': fr['name'], 'size': f"{fr['w']}x{fr['h']}"}
        if z: scr['size_label'] = z['title']
        if use_black:
            g = groups.setdefault(b['id'] if b else '_none', {'title': b['title'] if b else '(대분류 바 없음)', 'label_id': b['id'] if b else None, '_y': b['y'] if b else -1e9, '_x': b['x'] if b else 0, 'subgroups': {}})
            sg = g['subgroups'].setdefault(w_['id'] if w_ else '_none', {'title': w_['title'] if w_ else '(묶음 바 없음)', 'label_id': w_['id'] if w_ else None, '_x': w_['x'] if w_ else fr['x'], '_y': w_['y'] if w_ else fr['y'], 'screens': []})
            sg['screens'].append(scr)
        else:
            g = groups.setdefault(w_['id'] if w_ else '_none', {'title': w_['title'] if w_ else '(묶음 바 없음)', 'label_id': w_['id'] if w_ else None, '_y': w_['y'] if w_ else -1e9, '_x': w_['x'] if w_ else fr['x'], 'screens': []})
            g['screens'].append(scr)
    glist = []
    for g in sorted(groups.values(), key=lambda g: (g['_y'], g['_x'])):
        if 'subgroups' in g:
            g['subgroups'] = sorted(g['subgroups'].values(), key=lambda s: (s['_y'], s['_x']))
            for sg in g['subgroups']:
                sg.pop('_x'); sg.pop('_y'); sg['screens'].sort(key=lambda s: int(s['size'].split('x')[0]))
        else:
            g['screens'].sort(key=lambda s: int(s['size'].split('x')[0]))
        g.pop('_x'); g.pop('_y'); glist.append(g)
    sec = {'id': s['id'], 'name': s['name'], 'style': sec_style(s), 'children': len(kids), 'groups': glist}
    if black and not use_black: sec['file_bar'] = {'id': black[0]['id'], 'title': black[0]['title']}
    if others: sec['other_instances'] = sorted(set(others))
    return sec, cards

def build_root(node, is_page=False):
    root = {'id': node['id'], 'name': node['name'], 'style': None if is_page else sec_style(node), 'link_cards': [], 'sections': [], 'loose_frames': []}
    for c in node.get('children', []):
        if c['type'] == 'SECTION':
            sec, cards = build_section(c); root['sections'].append(sec); root['link_cards'] += cards
        elif c['type'] in ('FRAME', 'GROUP', 'COMPONENT'):
            if is_card(c): root['link_cards'].append(card_entry(c))
            else:
                x, y, w, h = bb(c); root['loose_frames'].append(f"{c['name']} {c['id']} {w}x{h}")
    if not root['loose_frames']: root.pop('loose_frames')
    return root

out = []
for label in order:
    f = files[label]; key = f['key']
    rawm = json.load(open(f"{SP}/raw-{safe(label)}-master.json")); rawf = json.load(open(f"{SP}/raw-{safe(label)}-flow.json"))
    master_pid = [p for p in f['pages'] if '마스터' in p[1]][0][0]; flow_pid = [p for p in f['pages'] if '플로우' in p[1]][0][0]
    domain, note = DOMAIN[label]
    top_secs = [c for c in rawm.get('children', []) if c['type'] == 'SECTION']
    entry = {'name': f['name'], 'key': key, 'url': f"https://www.figma.com/design/{key}/", 'format': 'new', 'domain': domain, 'last_modified': f['lastModified'][:10],
             'pages': [{'id': pid, 'name': pn, **({'role': 'master'} if '마스터' in pn else {'role': 'spec(기준 문서)'} if '플로우' in pn else {})} for pid, pn in f['pages'] if pn != '---']}
    if note: entry['note'] = note
    if label == '왓챠파티': entry['origin'] = "Common-Features '왓챠파티' 파일에서 Core로 승격 (노션 '왓챠 피그마 구조 개편안'). 2026-09-02 운영안에서 '경계를 가로지르는 케이스는 새 Core'의 예시로 지정"
    master = {'page': master_pid, 'roots': []}
    if top_secs and all(any(cc['type'] == 'SECTION' for cc in s.get('children', [])) for s in top_secs):
        for s in top_secs: master['roots'].append(build_root(s))
        loose = [c for c in rawm.get('children', []) if c['type'] in ('FRAME', 'GROUP') and not is_card(c)]
        if loose: master['page_loose_frames'] = [f"{c['name']} {c['id']} {bb(c)[2]}x{bb(c)[3]}" for c in loose]
        pcards = [card_entry(c) for c in rawm.get('children', []) if c['type'] == 'FRAME' and is_card(c)]
        if pcards: master['roots'][0]['link_cards'] += pcards
    elif top_secs:
        master['roots'].append(build_root(rawm, is_page=True)); master['roots'][0]['name'] = '(루트 섹션 없음 — 페이지 직속)'
    else:
        entry['format'] = 'other'
        master['roots'].append({'id': rawm['id'], 'name': '(섹션 없음)', 'style': None, 'link_cards': [], 'sections': [], 'loose_frames': [f"{c['name']} {c['id']} {bb(c)[2]}x{bb(c)[3]}" for c in rawm.get('children', []) if c['type'] in ('FRAME', 'GROUP')]})
    entry['master'] = master
    # 플로우
    spec = {'page': flow_pid, 'roots': []}
    for r in [c for c in rawf.get('children', []) if c['type'] == 'SECTION']:
        fr = {'id': r['id'], 'name': r['name'], 'sections': []}
        for c in r.get('children', []):
            if c['type'] == 'SECTION':
                ef = [f"{k['name']} {k['id']}" for k in c.get('children', []) if k['type'] in ('FRAME', 'SECTION') and bb(k)[2] >= 300 and not any(k['name'].startswith(s) for s in SKIP_ENTRY)]
                fr['sections'].append({'id': c['id'], 'name': c['name'], 'children': len(c.get('children', [])), 'entry_frames': ef})
            elif c['type'] == 'FRAME' and '가이드' in c['name']: fr['guide_frame'] = c['id']
            elif c['type'] == 'FRAME': fr.setdefault('loose_frames', []).append(f"{c['name']} {c['id']}")
        spec['roots'].append(fr)
    pl = [f"{c['name']} {c['id']}" for c in rawf.get('children', []) if c['type'] == 'FRAME']
    if pl: spec['page_loose_frames'] = pl
    if not spec['roots'] and not pl: spec['empty'] = True
    entry['spec'] = spec
    out.append(entry)
json.dump(out, open(f"{SP}/new-entries.json", 'w'), ensure_ascii=False, indent=1)
for e in out:
    print('##', e['name'], e['format'], 'roots:', [(r['name'], len(r['sections']), [(c['name'], c.get('section')) for c in r['link_cards']]) for r in e['master']['roots']], 'page_loose:', e['master'].get('page_loose_frames'))
    for r in e['master']['roots']:
        for s in r['sections']:
            n = sum(len(g.get('screens', [])) + sum(len(sg['screens']) for sg in g.get('subgroups', [])) for g in s['groups'])
            print(f"   [{s['name']}] groups={len(s['groups'])} screens={n} file_bar={s.get('file_bar',{}).get('title')} others={s.get('other_instances')}")
    print('   flow roots:', [(r['name'], [(s['name'], s['children'], len(s['entry_frames'])) for s in r['sections']]) for r in e['spec']['roots']], e['spec'].get('page_loose_frames'), e['spec'].get('empty'))
