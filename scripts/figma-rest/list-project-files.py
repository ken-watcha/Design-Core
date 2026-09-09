#!/usr/bin/env python3
"""Figma 폴더(프로젝트) 안 파일 목록과 각 파일의 페이지 목록을 REST API로 조회한다.

전제 (2026-09-09 기준 아직 충족 안 됨):
  1) 환경 변수 FIGMA_TOKEN 에 Figma 개인 액세스 토큰이 있어야 한다.
     - Figma > Settings > Security > Personal access tokens 에서 발급 (file_content:read 권한)
     - Claude Code 환경 설정의 환경 변수에 등록한다. 채팅에 토큰을 붙여넣지 말 것.
  2) 이 환경의 네트워크 정책이 api.figma.com 을 허용해야 한다.
     - 2026-09-09 확인: 현재 정책에서는 api.figma.com 이 차단됨 (프록시 403)

사용법:
  python3 scripts/figma-rest/list-project-files.py 591036590           # 폴더 안 파일 목록
  python3 scripts/figma-rest/list-project-files.py 591036590 --pages   # 파일별 페이지 목록까지
"""
import json, os, sys, urllib.request

token = os.environ.get("FIGMA_TOKEN")
if not token:
    sys.exit("FIGMA_TOKEN 환경 변수가 없습니다. (토큰을 채팅에 붙이지 말고 환경 설정에 등록하세요)")
if len(sys.argv) < 2:
    sys.exit(__doc__)
project_id = sys.argv[1]
want_pages = "--pages" in sys.argv

def get(url):
    req = urllib.request.Request(url, headers={"X-Figma-Token": token})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)

files = get(f"https://api.figma.com/v1/projects/{project_id}/files")
out = []
for f in files.get("files", []):
    row = {"name": f["name"], "key": f["key"], "last_modified": f.get("last_modified"), "url": f"https://www.figma.com/design/{f['key']}/"}
    if want_pages:
        doc = get(f"https://api.figma.com/v1/files/{f['key']}?depth=1")
        row["pages"] = [{"id": p["id"], "name": p["name"]} for p in doc["document"]["children"]]
    out.append(row)
print(json.dumps({"project": files.get("name"), "files": out}, ensure_ascii=False, indent=2))
