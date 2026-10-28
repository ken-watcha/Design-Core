"""Core마다 마스터 페이지에 쓰인 컴포넌트 이름을 세어 core-index.json 의 각 Core에 `components` 로 넣는다 (읽기 전용).

사용법: python3 scripts/figma-rest/build-component-index.py [Core 이름 일부 ...]   # 생략 시 색인의 Core 전부
  - 마스터 페이지(색인 master.page)를 REST로 깊이 제한 없이 받는다 (TVOD 약 27MB·7초).
  - 인스턴스 → 컴포넌트 세트 이름(세트가 없으면 컴포넌트 이름)으로 바꿔 센다. Core 전체는 많이 쓴 순서로 최대 400개(`components`),
    섹션 바로 아래 화면마다 쓰인 컴포넌트 번호 목록(`screen_components`, 이름은 `component_names`).
  - 받은 원본 개수는 .cache/component-index/ 에 남긴다. 일부 Core만 다시 받아도 나머지는 그 캐시로 채운다.
  - 앱 판별(judge.js)이 프로젝트 화면의 컴포넌트와 겹치는 정도로 어느 Core에 넣을지 정할 때 쓴다 (2026-10-26 윤우: 피쳐링셀은 SVOD·TVOD 둘 다 씀).
"""
import json, urllib.request, sys, os, re, collections, datetime
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
IDX = os.path.join(ROOT, "core-index", "core-index.json")
ONLY = sys.argv[1:]
MAX = 400
CACHE = os.path.join(ROOT, ".cache", "component-index"); os.makedirs(CACHE, exist_ok=True)

def get(url):
    with urllib.request.urlopen(urllib.request.Request(url), timeout=300) as r:
        return json.load(r)

def tally(n, name_of):
    cnt = collections.Counter()
    stack = [n]
    while stack:
        m = stack.pop()
        if m.get("type") == "INSTANCE":
            nm = name_of.get(m.get("componentId"), "").strip()
            if nm: cnt[nm] += 1
        stack.extend(m.get("children", []))
    return cnt

def _bb(n):
    b = n.get("absoluteBoundingBox") or {}
    return b.get("x", 0), b.get("y", 0), b.get("width", 0), b.get("height", 0)

def _cover(a, b):
    """a 넓이 중 b가 덮는 비율"""
    ix = max(0, min(a[0] + a[2], b[0] + b[2]) - max(a[0], b[0])); iy = max(0, min(a[1] + a[3], b[1] + b[3]) - max(a[1], b[1]))
    return ix * iy / max(1, a[2] * a[3])

def _opaque(n):
    if n.get("type") == "TEXT" or n.get("opacity", 1) < 0.2: return False
    return any(f.get("visible", True) and (f.get("type") in ("SOLID", "IMAGE") or f.get("type", "").startswith("GRADIENT"))
               for f in (n.get("fills") or []) if f.get("opacity", 1) * (f.get("color") or {}).get("a", 1) > 0.2)

def visible(frame, name_of):
    """화면에 가려지지 않고 보이는 컴포넌트 이름. 위에 딤·바텀시트·드롭다운 같은 불투명한 층이 절반 넘게 덮은 인스턴스는 뺀다
    (2026-10-26 윤우: 그 Core의 기능 뒤에 배경으로 깔린 피쳐링셀은 그 Core 기능과 상관없음 — 소식함 드롭다운·왓챠파티 딤·나의 왓챠 비로그인 막)."""
    order, end = [], {}
    def walk(n):
        if n.get("visible") is False: return
        i = len(order); order.append(n)
        for ch in n.get("children", []): walk(ch)
        end[i] = len(order)
    walk(frame)
    screen = _bb(frame)
    later = [(i, _bb(n)) for i, n in enumerate(order) if i and _opaque(n)]
    out = collections.Counter()
    i = 0
    while i < len(order):
        n = order[i]
        if n.get("type") == "INSTANCE":
            b = _bb(n)
            if _cover(b, screen) >= 0.5 and not any(j >= end[i] and _cover(b, ob) >= 0.5 for j, ob in later):
                out += tally(n, name_of)
            i = end[i]; continue   # 인스턴스 안쪽은 이 인스턴스와 같이 본다
        i += 1
    return out

def count(doc, comps, sets, screens):
    """페이지 전체 개수를 돌려주고, 섹션 바로 아래 화면(폭·높이 300 이상)마다 개수를 screens에 쌓는다."""
    name_of = {}
    for cid, c in comps.items():
        s = sets.get(c.get("componentSetId") or "")
        name_of[cid] = (s or {}).get("name") or c.get("name") or ""
    stack = [(doc, None)]
    while stack:
        n, parent = stack.pop()
        bb = n.get("absoluteBoundingBox") or {}
        if n.get("type") == "FRAME" and parent and parent.get("type") == "SECTION" and bb.get("width", 0) >= 300 and bb.get("height", 0) >= 300:
            c = tally(n, name_of)
            if c: screens.append({"id": n["id"], "name": n.get("name", "")[:40], "w": round(bb["width"]), "h": round(bb["height"]), "x": round(bb.get("x", 0)), "y": round(bb.get("y", 0)), "section": parent.get("id"), "sectionName": parent.get("name", "")[:40], "c": c, "v": visible(n, name_of)})
            continue
        for ch in n.get("children", []): stack.append((ch, n))
    return tally(doc, name_of)

idx = json.load(open(IDX))
names = []
pos = {n: i for i, n in enumerate(names)}
def nid(n):
    if n not in pos: pos[n] = len(names); names.append(n)
    return pos[n]
for f in idx["files"]:
    if ONLY and not any(o in f["name"] for o in ONLY): continue
    page = (f.get("master") or {}).get("page")
    if not page: print("건너뜀(마스터 페이지 없음):", f["name"]); continue
    base = f"https://api.figma.com/v1/files/{f['key']}/nodes?ids="
    # 파일 이름은 Figma 지금 것으로 (2026-10-28: 색인은 "SVOD (홈)"인데 실제는 "SVOD ⚜️"라 앱 표시가 어긋남)
    try:
        now = get(f"https://api.figma.com/v1/files/{f['key']}?depth=1").get("name")
        if now and now != f["name"]: print("이름 갱신:", f["name"], "→", now); f["name"] = now
    except Exception as e: print("이름 못 읽음:", f["name"], str(e)[:60])
    cnt = collections.Counter(); screens = []
    try:
        node = get(base + page)["nodes"][page]
        cnt = count(node["document"], node.get("components", {}), node.get("componentSets", {}), screens)
    except Exception as e:
        # 페이지가 너무 크면(SVOD 502) 페이지 바로 아래 요소를 하나씩 받는다
        print("  페이지 통째로 실패 → 나눠 받기:", f["name"], str(e)[:80])
        try:
            kids = [c["id"] for c in get(base + page + "&depth=1")["nodes"][page]["document"].get("children", [])]
            for k in kids:
                node = get(base + k)["nodes"][k]
                cnt += count(node["document"], node.get("components", {}), node.get("componentSets", {}), screens)
        except Exception as e2:
            print("실패:", f["name"], str(e2)[:200]); continue
    f["components"] = dict(cnt.most_common(MAX))
    json.dump({"components": cnt, "screens": [dict(s, c=dict(s["c"]), v=dict(s["v"])) for s in screens]}, open(os.path.join(CACHE, f["key"] + ".json"), "w"), ensure_ascii=False)
    print(f"{f['name']}: 컴포넌트 {len(cnt)}종, 인스턴스 {sum(cnt.values())}개, 화면 {len(screens)}장")

# 화면별 컴포넌트: 이름표(component_names) 번호 목록. 개수는 버린다 — 판별은 "프로젝트 화면의 컴포넌트가 이 화면에 들어 있나"만 본다
# 메인 화면(main: APP/WEB): 🌏 화면이 있으면 그것, 없으면 섹션마다 맨 왼쪽 화면 — Core는 APP·WEB 섹션 맨 왼쪽에 대표 화면을 둔다
# ("○○ 진입" 섹션은 다른 Core 화면을 가져다 둔 곳이라 뺀다). 2026-10-26 윤우: 🌏 표시는 Core 4개에만 있음
def platform(s):
    for t in (s["name"], s.get("sectionName") or ""):
        if re.search(r"web", t, re.I): return "WEB"
        if re.search(r"app|모바일", t, re.I): return "APP"
    return "WEB" if s["w"] >= 1000 else "APP"
def mains(screens):
    globe = [s for s in screens if s["name"].startswith("🌏")]
    if globe: return {s["id"]: platform(s) for s in globe}
    out, by = {}, collections.defaultdict(list)
    for s in screens:
        if "x" in s and "진입" not in (s.get("sectionName") or ""): by[s.get("section")].append(s)
    for ss in by.values():
        first = min(ss, key=lambda s: (s["x"], s["y"])); out[first["id"]] = platform(first)
    return out
for f in idx["files"]:
    p = os.path.join(CACHE, f["key"] + ".json")
    if not os.path.exists(p): continue
    screens = json.load(open(p))["screens"]; m = mains(screens)
    f["screen_components"] = [dict({"id": s["id"], "name": s["name"], "w": s["w"], "h": s["h"]}, **({"main": m[s["id"]], "vis": sorted(nid(k) for k in s.get("v", {}))} if s["id"] in m else {}), c=sorted(nid(k) for k in s["c"])) for s in screens]
idx["component_names"] = names
idx["_meta"]["components_built"] = datetime.date.today().isoformat()
text = json.dumps(idx, ensure_ascii=False, indent=1)
text = re.sub(r'\[\s*(\d+(?:,\s*\d+)*)\s*\]', lambda m: "[" + ",".join(m.group(1).replace(" ", "").replace("\n", "").split(",")) + "]", text)   # 번호 목록은 한 줄로
open(IDX, "w").write(text + "\n")
