#!/usr/bin/env python3
"""Figma 폴더(프로젝트) 안 파일 목록과 각 파일의 페이지 목록을 REST API로 조회한다.

전제:
  1) Figma 개인 액세스 토큰. 권한(Scopes)은 file_content:read + projects:read 둘 다 필요
     (폴더 목록 GET /v1/projects/:id/files 는 projects:read 없으면 403).
     - Figma > Settings > Security > Personal access tokens 에서 발급. 만료 기간을 짧게 두면
       만료 후 401 "Token has expired"가 나므로 넉넉히(또는 만료 없음) 발급한다.
     - 토큰 전달 방식 2가지 (채팅에 토큰을 붙여넣지 말 것):
       (a) 클라우드 환경의 "API credentials"에 호스트 api.figma.com + 헤더 X-Figma-Token(접두어 없음)
           → 프록시가 붙여 주므로 스크립트는 헤더 없이 호출. 세션에서 토큰이 안 보임 (권장)
           자격 증명은 수정이 안 되므로 재발급 시 삭제 후 재등록.
       (b) 환경 변수 FIGMA_TOKEN → 이 스크립트가 X-Figma-Token 헤더로 붙임
  2) 환경의 네트워크 정책이 api.figma.com 을 허용해야 한다.
     - 2026-09-09: 구 환경(naver-crawler)에서는 차단(프록시 403 connect_rejected)
     - 2026-09-18: Design-Core 환경에서 허용 확인 (연결 OK, 토큰 만료만 남음 → 재발급 필요)

사용법:
  python3 scripts/figma-rest/list-project-files.py 591036590           # 폴더 안 파일 목록
  python3 scripts/figma-rest/list-project-files.py 591036590 --pages   # 파일별 페이지 목록까지
  python3 scripts/figma-rest/list-project-files.py --check              # 토큰·네트워크 점검만 (GET /v1/me)

오류 해석:
  401 "Token has expired"/"Invalid token" → 토큰 만료·오타. 재발급 후 API credentials 재등록
  403 (프록시, connect_rejected)          → 네트워크 허용 목록에 api.figma.com 없음. Ken에게 요청
  403 (Figma, 폴더 목록만)                 → 토큰에 projects:read 권한 없음. 재발급
"""
import json, os, sys, urllib.error, urllib.request

token = os.environ.get("FIGMA_TOKEN")
if len(sys.argv) < 2:
    sys.exit(__doc__)
check_only = "--check" in sys.argv
want_pages = "--pages" in sys.argv
project_id = next((a for a in sys.argv[1:] if not a.startswith("--")), None)
if not check_only and not project_id:
    sys.exit(__doc__)


def explain(e):
    """HTTP 오류를 원인별로 풀어 쓴다. Figma 본문의 err 와 프록시 헤더를 함께 보여준다."""
    raw = ""
    body = ""
    from_figma = False
    try:
        raw = e.read().decode("utf-8", "replace")
        parsed = json.loads(raw)
        body = str(parsed.get("err", raw))
        from_figma = "err" in parsed  # Figma REST 오류 본문은 {"status":..,"err":".."} 형태
    except Exception:
        body = raw
    proxy = e.headers.get("X-Proxy-Error", "")
    # 프록시가 연결 자체를 거부하면 Figma 본문이 없고 connect_rejected 가 온다.
    # 프록시가 토큰을 붙였는데 Figma가 거부하면 Figma 본문 + X-Proxy-Error(upstream auth failed) 둘 다 온다.
    where = "Figma" if from_figma else "프록시"
    lines = [f"{e.code} ({where}): {body or e.reason}"]
    if proxy:
        lines.append(f"  프록시 메시지: {proxy}  (프록시가 API credentials 토큰을 붙였고 Figma가 거부함)")
    if e.code == 401 or "expired" in body.lower():
        lines.append("  → 토큰이 만료됐거나 틀립니다. Figma에서 재발급(file_content:read + projects:read)한 뒤 "
                     "환경의 API credentials(api.figma.com, X-Figma-Token)를 삭제·재등록하세요. "
                     "환경 변수 FIGMA_TOKEN 방식이면 값을 교체하세요.")
    elif e.code == 403 and where == "프록시":
        lines.append("  → 네트워크 허용 목록에 api.figma.com 이 없습니다. Ken에게 추가를 요청하세요 (새 세션부터 적용).")
    elif e.code == 403:
        lines.append("  → 토큰 권한 부족일 가능성이 큽니다. 폴더 목록은 projects:read 가 필요합니다.")
    return "\n".join(lines)


def get(url):
    headers = {"X-Figma-Token": token} if token else {}
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit(explain(e))


if check_only:
    me = get("https://api.figma.com/v1/me")
    print(json.dumps({"ok": True, "handle": me.get("handle"), "email": me.get("email"),
                      "token_source": "FIGMA_TOKEN" if token else "proxy(API credentials)"},
                     ensure_ascii=False, indent=2))
    sys.exit(0)

files = get(f"https://api.figma.com/v1/projects/{project_id}/files")
out = []
for f in files.get("files", []):
    row = {"name": f["name"], "key": f["key"], "last_modified": f.get("last_modified"), "url": f"https://www.figma.com/design/{f['key']}/"}
    if want_pages:
        doc = get(f"https://api.figma.com/v1/files/{f['key']}?depth=1")
        row["pages"] = [{"id": p["id"], "name": p["name"]} for p in doc["document"]["children"]]
    out.append(row)
print(json.dumps({"project": files.get("name"), "files": out}, ensure_ascii=False, indent=2))
