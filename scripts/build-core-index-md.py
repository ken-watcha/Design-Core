#!/usr/bin/env python3
"""core-index/core-index.json → docs/core-index.md 생성. JSON을 고친 뒤 실행한다.
사용법: python3 scripts/build-core-index-md.py"""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
idx = json.load(open(os.path.join(ROOT, "core-index/core-index.json"), encoding="utf-8"))
L = lambda key, node: f"https://www.figma.com/design/{key}/?node-id={node.replace(':','-')}"
out = ["# Core 파일 색인 (읽기용)", "", f"> 갱신 {idx['_meta']['updated']} · 기계용 원본은 `core-index/core-index.json` (이 문서는 그 파일에서 생성). 수록 범위: 폴더 안 파일 중 키를 아는 4개.", "", f"폴더: {idx['_meta']['folder']}", ""]
out += ["## 파일 형식 두 가지", "", f"- **새 형식**: {idx['_meta']['format_notes']['new_format']}", f"- **구 형식**: {idx['_meta']['format_notes']['old_format']}", ""]
for f in idx["files"]:
    k = f["key"]
    out += [f"## {f['name']}", "", f"- 파일: {f['url']} (키 `{k}`, 형식: {f['format']})", f"- 다루는 영역: {' / '.join(f['domain'])}"]
    if f.get("origin"): out.append(f"- 출처: {f['origin']}")
    if f.get("pilot"): out.append(f"- 파일럿: {f['pilot']}")
    if f.get("note"): out.append(f"- 메모: {f['note']}")
    out += ["", "### 페이지", ""]
    for p in f["pages"]:
        out.append(f"- [{p['name'].strip()}]({L(k,p['id'])}) `{p['id']}`" + (f" — {p['role']}" if p.get('role') else ""))
    if "master" in f:
        m = f["master"]
        out += ["", f"### 마스터 페이지 구조 — 루트 섹션 [{m['root_section']['name']}]({L(k,m['root_section']['id'])}) `{m['root_section']['id']}`", ""]
        if m.get("link_card"):
            c = m["link_card"]
            out.append(f"- 📎 링크 카드 [{c['name']}]({L(k,c['id'])}) `{c['id']}` → 기준 문서 {c['link_to']} · 기준 정보 기입: {'있음' if c.get('has_base_info') else '없음'}" + (f" · {c['note']}" if c.get('note') else ""))
        else:
            out.append("- 📎 링크 카드: **없음** (새 형식이지만 카드 미배치 → 이관 시 추가 대상)")
        for s in m["sections"]:
            out += ["", f"#### {s['name']} 섹션 `{s['id']}`", ""]
            for g in s["groups"]:
                out.append(f"- **{g['title']}**" + (f" (설명 바 `{g['label_id']}`)" if g.get('label_id') else ""))
                def rows(screens, indent="  "):
                    for sc in screens:
                        out.append(f"{indent}- [{sc['name']}]({L(k,sc['id'])}) `{sc['id']}` {sc['size']}" + (f" — {sc['note']}" if sc.get('note') else ""))
                if g.get("subgroups"):
                    for sg in g["subgroups"]:
                        out.append(f"  - {sg['title']}" + (f" (설명 바 `{sg['label_id']}`)" if sg.get('label_id') else ""))
                        rows(sg["screens"], "    ")
                else:
                    rows(g["screens"])
    if "spec" in f:
        sp = f["spec"]
        out += ["", f"### 플로우 페이지(기준 문서) — 루트 [{sp['root_section']['name']}]({L(k,sp['root_section']['id'])}) `{sp['root_section']['id']}`", ""]
        if sp.get("note"): out.append(f"- 메모: {sp['note']}")
        for s in sp["sections"]:
            out.append(f"- {s['name']} `{s['id']}` (자식 {s.get('children','?')}개)")
            if s.get("entry_frames"): out.append("  - 진입 프레임: " + ", ".join(s["entry_frames"]))
            for ss in s.get("subsections", []): out.append(f"  - 하위 섹션 [{ss['name']}]({L(k,ss['id'])}) `{ss['id']}` (자식 {ss['children']}개)")
        if sp.get("loose_frames"): out.append("- 섹션 밖 프레임: " + ", ".join(sp["loose_frames"]))
    if "old_format_sections" in f:
        out += ["", "### 구 형식 섹션", ""]
        for pg in f["old_format_sections"]:
            out.append(f"- 페이지 `{pg['page']}`")
            for s in pg["sections"]:
                out.append(f"  - [{s['name'].strip()}]({L(k,s['id'])}) `{s['id']}` (자식 {s['children']}개)" + (f" · Guide `{s['guide']}`" if s.get('guide') else ""))
    out.append("")
out += ["## 아직 색인에 없는 Core 파일", ""]
for u in idx["known_but_unindexed"]: out.append(f"- {u['name']} — {u['note']}")
out += ["", "## 관련 파일 (Core 아님)", ""]
for r in idx["related_files"]:
    out.append(f"- {r['name']} — 키 `{r['key']}`, 역할: {r['role']}. 페이지: " + ", ".join(f"{p['name'].strip()} `{p['id']}`" for p in r["pages"]))
open(os.path.join(ROOT, "docs/core-index.md"), "w", encoding="utf-8").write("\n".join(out) + "\n")
print("docs/core-index.md", len(out), "lines")
