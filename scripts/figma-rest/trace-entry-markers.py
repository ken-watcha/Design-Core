#!/usr/bin/env python3
"""Core 플로우 페이지의 번호 마커를 따라가 "어느 화면의 어느 요소 → 어느 진입 프레임"인지 표로 뽑는다 (읽기 전용).

왜: 플로우 페이지의 진입 프레임은 이름이 "리스트 상세 페이지"·"기타 상세 페이지"처럼 일반명이고 안이 빈 껍데기라
     이름만으로는 어떤 화면인지 알 수 없다. 대신 홈 같은 출발 화면 옆에 놓인 번호 텍스트(1, 2, 3…)가
     진입 프레임으로 하이퍼링크(nodeID)돼 있고, 그 번호의 y 좌표가 출발 화면의 어느 로우/셀 위인지가 곧 "진입 위치"다.
     → 로우 제목 텍스트(예: "새로 올라온 콘텐츠")를 프로젝트 문서의 예시 이름과 대조하면 자리표시 프레임의 정체를 알 수 있다.

사용법:
  python3 scripts/figma-rest/trace-entry-markers.py <파일키> <섹션 node-id> [출발 프레임 node-id]
  예) SVOD APP:  python3 scripts/figma-rest/trace-entry-markers.py T6txdtsZ5utexHAR2DyPRw 106:192402 156:77014
      TVOD APP:  python3 scripts/figma-rest/trace-entry-markers.py aBcQKIbe9nOsPMNQOagw2v 22:26371 22:13837
      검색 APP:  python3 scripts/figma-rest/trace-entry-markers.py 9BOnazPjHfZgssTKl9kEMN 37:40756
  출발 프레임을 생략하면 섹션 안에서 가장 높이가 큰 프레임(홈 롱 프레임)을 쓴다.
  토큰은 환경의 API 자격 증명(프록시 주입) 또는 FIGMA_TOKEN.

출력: 마커 텍스트 · 가리키는 진입 프레임 · 마커가 걸린 출발 화면 요소 경로(로우 이름 › 셀) · 그 요소의 첫 텍스트(로우 제목)
"""
import json, os, re, sys, urllib.request

token = os.environ.get("FIGMA_TOKEN")

def get(url):
    req = urllib.request.Request(url, headers={"X-Figma-Token": token} if token else {})
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.load(r)

def bb(n):
    b = n.get("absoluteBoundingBox") or {}
    return round(b.get("x", 0)), round(b.get("y", 0)), round(b.get("width", 0)), round(b.get("height", 0))

def find(n, nid):
    if n["id"] == nid: return n
    for c in n.get("children", []):
        r = find(c, nid)
        if r: return r

def texts(n, acc):
    if n.get("type") == "TEXT" and n.get("visible", True): acc.append(n.get("characters", "")[:40].replace("\n", " / "))
    for c in n.get("children", []): texts(c, acc)
    return acc

def hyperlink_nodes(n):
    out = []
    if n.get("type") == "TEXT":
        hls = ([n["hyperlink"]] if n.get("hyperlink") else []) + [v["hyperlink"] for v in (n.get("styleOverrideTable") or {}).values() if v.get("hyperlink")]
        out = [h.get("nodeID") for h in hls if h.get("nodeID")]
    return out

def markers(sec):
    acc = []
    def rec(n):
        if n.get("type") == "TEXT":
            l = hyperlink_nodes(n)
            if l: acc.append({"text": n.get("characters", "")[:30].replace("\n", " / "), "targets": l, "box": bb(n)})
        for c in n.get("children", []): rec(c)
    rec(sec)
    return sorted(acc, key=lambda m: (m["box"][1], m["box"][0]))

def element_path(frame, x, y):
    """출발 프레임 안에서 (x,y)를 덮는 가장 깊은 요소까지의 경로. 마커는 프레임 오른쪽 여백에 놓이므로 x는 프레임 안으로 당겨서 본다."""
    fx, fy, fw, fh = bb(frame)
    x = fx + fw // 2  # 마커는 프레임 오른쪽 여백에 놓이므로 x는 프레임 가운데로 본다 (로우는 가로로 꽉 참)
    path = []
    node = frame
    for _ in range(4):
        hits = [c for c in node.get("children", []) if c.get("type") in ("FRAME", "INSTANCE", "GROUP")
                and bb(c)[1] <= y <= bb(c)[1] + bb(c)[3] and bb(c)[0] <= x <= bb(c)[0] + bb(c)[2]]
        if not hits: break
        nxt = min(hits, key=lambda c: bb(c)[3])  # 가장 작은(구체적인) 요소
        path.append(nxt); node = nxt
    return path

def main():
    if len(sys.argv) < 3: sys.exit(__doc__)
    key, sec_id = sys.argv[1], sys.argv[2]
    src_id = sys.argv[3] if len(sys.argv) > 3 else None
    doc = get(f"https://api.figma.com/v1/files/{key}/nodes?ids={sec_id}&depth=4")
    sec = doc["nodes"][sec_id]["document"]
    frames = {c["id"]: c for c in sec.get("children", []) if c.get("type") in ("FRAME", "SECTION")}
    if not src_id:
        src_id = max(frames.values(), key=lambda c: bb(c)[3])["id"]
    src = get(f"https://api.figma.com/v1/files/{key}/nodes?ids={src_id}")["nodes"][src_id]["document"]
    sx, sy, sw, sh = bb(src)
    print(f"섹션 {sec['name']} ({sec_id}) · 출발 프레임 {src['name']} ({src_id}) {sw}x{sh}\n")
    print(f"{'마커':<28} {'→ 진입 프레임':<34} {'출발 화면의 요소 (로우 › 셀)':<60} 로우 제목")
    for m in markers(sec):
        tg = ", ".join(f"{frames[t]['name']} {t}" if t in frames else t for t in m["targets"])
        mx, my = m["box"][0], m["box"][1] + m["box"][3] // 2
        if not (sy <= my <= sy + sh):
            print(f"{m['text']:<28} {tg:<34} (출발 프레임 밖 y={my})"); continue
        path = element_path(src, mx, my)
        names = " › ".join(f"{p['name']} {p['id']}" for p in path[1:]) or "(요소 없음)"
        row = path[1] if len(path) > 1 else (path[0] if path else None)  # 바디 프레임 아래 첫 단계 = 로우/섹션
        title = next(iter(texts(row, [])), "") if row else ""
        leaf = next(iter(texts(path[-1], [])), "") if path else ""
        print(f"{m['text']:<28} {tg:<34} {names[:60]:<60} 로우 {title!r} · 요소 {leaf!r}")

if __name__ == "__main__":
    main()
