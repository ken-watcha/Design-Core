#!/usr/bin/env python3
"""core-index/core-index.json → docs/core-index.md 생성. JSON을 고친 뒤 실행한다.
사용법: python3 scripts/build-core-index-md.py

JSON 항목은 두 구조를 지원한다.
- 세션 2 구조: master.root_section + master.sections[] / spec.root_section + spec.sections[]
- 세션 3 구조: master.roots[] (루트 섹션이 여러 개일 수 있음) / spec.roots[]
"""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
idx = json.load(open(os.path.join(ROOT, "core-index/core-index.json"), encoding="utf-8"))
L = lambda key, node: f"https://www.figma.com/design/{key}/?node-id={node.replace(':','-')}"
out = ["# Core 파일 색인 (읽기용)", "", f"> 갱신 {idx['_meta']['updated']} · 기계용 원본은 `core-index/core-index.json` (이 문서는 그 파일에서 생성).", f"> 수록 범위: {idx['_meta']['coverage']}", "", f"폴더: {idx['_meta']['folder']}", ""]
out += ["## 파일 형식", "", f"- **새 형식**: {idx['_meta']['format_notes']['new_format']}", f"- **구 형식**: {idx['_meta']['format_notes']['old_format']}", ""]
if idx.get("cover_format"): out += [f"- **Cover 페이지**: {idx['cover_format']}", ""]
if idx["_meta"].get("link_card_forms"):
    out += ["### 링크 카드 형태", ""]
    for k, v in idx["_meta"]["link_card_forms"].items(): out.append(f"- **{k}**: {v}")
    out.append("")

def screen_row(k, sc, indent):
    tag = f" [{sc['size_label']}]" if sc.get("size_label") else ""
    out.append(f"{indent}- [{sc['name'].strip()}]({L(k,sc['id'])}) `{sc['id']}` {sc['size']}{tag}" + (f" — {sc['note']}" if sc.get('note') else ""))

def render_groups(k, groups, indent="- "):
    for g in groups:
        out.append(f"- **{g['title']}**" + (f" (설명 바 `{g['label_id']}`)" if g.get('label_id') else ""))
        if g.get("subgroups"):
            for sg in g["subgroups"]:
                out.append(f"  - {sg['title']}" + (f" (설명 바 `{sg['label_id']}`)" if sg.get('label_id') else ""))
                for sc in sg["screens"]: screen_row(k, sc, "    ")
        else:
            for sc in g.get("screens", []): screen_row(k, sc, "  ")

def render_card(k, c):
    base = f"- 📎 링크 카드 [{c['name']}]({L(k,c['id'])}) `{c['id']}`" + (f" (섹션 {c['section']})" if c.get('section') else "")
    base += f" → 기준 문서 {c.get('link_to') or '(링크 없음)'} · 기준 정보 기입: {'있음' if c.get('has_base_info') else '없음'}"
    if c.get("note"): base += f" · {c['note']}"
    out.append(base)

for f in idx["files"]:
    k = f["key"]
    out += [f"## {f['name']}", "", f"- 파일: {f['url']} (키 `{k}`, 형식: {f['format']}" + (f", 최종 수정 {f['last_modified']}" if f.get('last_modified') else "") + ")", f"- 다루는 영역: {' / '.join(f['domain'])}"]
    if f.get("origin"): out.append(f"- 출처: {f['origin']}")
    if f.get("pilot"): out.append(f"- 파일럿: {f['pilot']}")
    if f.get("note"): out.append(f"- 메모: {f['note']}")
    out += ["", "### 페이지", ""]
    for p in f["pages"]:
        out.append(f"- [{p['name'].strip()}]({L(k,p['id'])}) `{p['id']}`" + (f" — {p['role']}" if p.get('role') else ""))
    m = f.get("master")
    if m and "roots" in m:
        for r in m["roots"]:
            style = f" · 스타일 fill {r['style']['fill']}" + (f" radius {r['style']['radius']}" if r['style'].get('radius') else "") if r.get("style") else ""
            out += ["", f"### 마스터 페이지 구조 — 루트 섹션 [{r['name']}]({L(k,r['id'])}) `{r['id']}`{style}", ""]
            if r.get("link_cards"):
                for c in r["link_cards"]: render_card(k, c)
            else:
                out.append("- 📎 링크 카드: **없음** → 이관 시 추가 대상")
            if r.get("loose_frames"): out.append("- 섹션 밖 프레임: " + ", ".join(r["loose_frames"]))
            for s in r["sections"]:
                st = f" · fill {s['style']['fill']}" if s.get("style") and s["style"].get("fill") else ""
                fb = f" · 파일 바 ⚫ '{s['file_bar']['title']}' `{s['file_bar']['id']}`" if s.get("file_bar") else ""
                out += ["", f"#### {s['name']} 섹션 `{s['id']}` (자식 {s.get('children','?')}개{st}{fb})", ""]
                if s.get("other_instances"): out.append(f"- 기타 인스턴스: {', '.join(s['other_instances'])}")
                render_groups(k, s["groups"])
        if m.get("page_loose_frames"): out.append("- 페이지 직속 프레임: " + ", ".join(m["page_loose_frames"]))
    elif m:
        out += ["", f"### 마스터 페이지 구조 — 루트 섹션 [{m['root_section']['name']}]({L(k,m['root_section']['id'])}) `{m['root_section']['id']}`", ""]
        if m.get("link_card"):
            c = m["link_card"]
            out.append(f"- 📎 링크 카드 [{c['name']}]({L(k,c['id'])}) `{c['id']}` → 기준 문서 {c['link_to']} · 기준 정보 기입: {'있음' if c.get('has_base_info') else '없음'}" + (f" · {c['note']}" if c.get('note') else ""))
        else:
            out.append("- 📎 링크 카드: **없음** (새 형식이지만 카드 미배치 → 이관 시 추가 대상)")
        for s in m["sections"]:
            out += ["", f"#### {s['name']} 섹션 `{s['id']}`", ""]
            render_groups(k, s["groups"])
    sp = f.get("spec")
    if sp and "roots" in sp:
        if sp.get("empty"): out += ["", "### 플로우 페이지 — **비어 있음**", ""]
        for r in sp["roots"]:
            out += ["", f"### 플로우 페이지(기준 문서) — 루트 [{r['name']}]({L(k,r['id'])}) `{r['id']}`" + (f" · 가이드 `{r['guide_frame']}`" if r.get('guide_frame') else ""), ""]
            for s in r["sections"]:
                out.append(f"- {s['name']} `{s['id']}` (자식 {s.get('children','?')}개)")
                if s.get("entry_frames"): out.append("  - 프레임: " + ", ".join(s["entry_frames"]))
            if r.get("loose_frames"): out.append("- 루트 안 섹션 밖 프레임: " + ", ".join(r["loose_frames"]))
        if sp.get("page_loose_frames"): out.append("- 페이지 직속 프레임: " + ", ".join(sp["page_loose_frames"]))
    elif sp:
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
out += ["## 확인 필요 / 색인 밖", ""]
for u in idx["known_but_unindexed"]: out.append(f"- {u['name']}" + (f" (키 `{u['key']}`)" if u.get('key') else "") + f" — {u['note']}")
out += ["", "## 관련 파일 (Core 아님)", ""]
for r in idx["related_files"]:
    out.append(f"- {r['name']} — 키 `{r['key']}`, 역할: {r['role']}. 페이지: " + ", ".join(f"{p['name'].strip()} `{p['id']}`" for p in r["pages"]))
open(os.path.join(ROOT, "docs/core-index.md"), "w", encoding="utf-8").write("\n".join(out) + "\n")
print("docs/core-index.md", len(out), "lines")
