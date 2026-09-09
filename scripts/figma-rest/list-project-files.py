#!/usr/bin/env python3
"""Figma 폴더(프로젝트) 안 파일 목록과 각 파일의 페이지 목록을 REST API로 조회한다.

전제:
  1) Figma 토큰이 붙어 있어야 한다 — 환경의 API 자격 증명(api.figma.com, 헤더 X-Figma-Token) 또는 환경 변수 FIGMA_TOKEN.
     - Figma > Settings > Security > Personal access tokens 에서 발급. 채팅에 토큰을 붙여넣지 말 것.
     - **폴더(프로젝트) 조회에는 `projects:read` 범위가 필요하다.** 2026-09-09 Design-Core 환경 확인: 네트워크·토큰 주입은 정상,
       파일 읽기(file_content:read)는 되지만 이 엔드포인트는 Figma가 403 "Invalid scope"로 거부 → 토큰에 projects:read 추가 후 재등록.
  2) 이 환경의 네트워크 정책이 api.figma.com 을 허용해야 한다 (Design-Core 환경: 허용됨).

폴더 조회가 안 될 때의 대안: 다른 Core의 플로우 페이지에 걸린 "○○ 코어 파일 링크" 하이퍼링크에서 파일 키를 모으거나(dump-core-file.py 참고),
Ken이 파일 링크를 직접 준다 (2026-09-09에는 Ken이 14개 링크를 줌 → scripts/figma-rest/core-files.json).

사용법:
  python3 scripts/figma-rest/list-project-files.py 591036590           # 폴더 안 파일 목록
  python3 scripts/figma-rest/list-project-files.py 591036590 --pages   # 파일별 페이지 목록까지
"""
import json, os, sys, urllib.request

# 토큰 전달 방식 2가지:
#  (a) 환경 변수 FIGMA_TOKEN → 이 스크립트가 X-Figma-Token 헤더로 붙임
#  (b) 클라우드 환경의 "API credentials"에 api.figma.com 호스트 + 헤더 X-Figma-Token(접두어 없음)으로 등록
#      → 프록시가 요청에 붙여 주므로 여기선 헤더 없이 호출. 세션에서는 토큰이 보이지 않음 (더 안전, 권장)
token = os.environ.get("FIGMA_TOKEN")
if len(sys.argv) < 2:
    sys.exit(__doc__)
project_id = sys.argv[1]
want_pages = "--pages" in sys.argv

def get(url):
    headers = {"X-Figma-Token": token} if token else {}
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            sys.exit(f"{e.code}: 토큰이 없거나 틀립니다. FIGMA_TOKEN 환경 변수 또는 환경의 API credentials(api.figma.com, X-Figma-Token)를 확인하세요.")
        raise

files = get(f"https://api.figma.com/v1/projects/{project_id}/files")
out = []
for f in files.get("files", []):
    row = {"name": f["name"], "key": f["key"], "last_modified": f.get("last_modified"), "url": f"https://www.figma.com/design/{f['key']}/"}
    if want_pages:
        doc = get(f"https://api.figma.com/v1/files/{f['key']}?depth=1")
        row["pages"] = [{"id": p["id"], "name": p["name"]} for p in doc["document"]["children"]]
    out.append(row)
print(json.dumps({"project": files.get("name"), "files": out}, ensure_ascii=False, indent=2))
