# 깊은 복제 절차 (파일 A의 화면 → 파일 B) — use_figma 2~3회

스파이크(docs/spike-2026-09-10-deep-clone.md)에서 검증된 절차. 쓰기는 Ken 승인 후 브랜치/사본에서만.

1. **A에서 직렬화 (읽기)**: 프레임 트리를 걷는다. 프레임/텍스트는 속성(크기·위치·오토레이아웃·채우기·폰트)을, INSTANCE는 자식으로 내려가지 않고 `mainComponent.key`·컴포넌트 세트 키·변형 이름·`componentProperties` 값·텍스트 오버라이드(이름 경로 → 문자)·중첩 인스턴스 오버라이드(경로 → 키·속성·표시)·이미지 채우기(경로 → 해시)를 적는다. 소식함 화면 1장 = 8KB.
2. **B에서 재구성 (쓰기)**: 프레임 생성 → 인스턴스는 `importComponentByKeyAsync(키)` → 실패하면 `importComponentSetByKeyAsync(세트 키)`에서 변형 이름으로 → 그래도 실패하면 **B 안에서 같은 키의 기존 인스턴스를 찾아 `clone()`** (다른 페이지는 `page.loadAsync()` 후 `findAllWithCriteria`). `setProperties` → 텍스트는 `getStyledTextSegments(['fontName'])`로 폰트 로드 후 교체 → 중첩 인스턴스는 경로로 찾아 `setProperties`.
3. **이미지**: `figma.getImageByHash(해시)`가 B에 있으면 그대로 채우기. 없으면 **`download_assets(A, 화면 노드)`로 원본 이미지 주소를 받아 `curl`로 내려받고 → `upload_assets(B, count, nodeIds=[채울 노드…])`로 올리기 주소를 받아 `curl -F "file=@x.png;type=image/png"`로 POST** (주소는 10분 한정·1회용, `mcp.figma.com` — 2026-09-10 허용됨). **주의: 응답은 `{success, imageHash}`인데 "지정 노드에 자동 채우기"는 브랜치에서 일어나지 않았다(세션 5 확인). 그래서 마지막 단계로 `use_figma`에서 `node.fills = [{type:'IMAGE', imageHash: <응답 해시>, scaleMode:'FILL'}]`을 직접 넣는다** — 해시는 올리는 순간 그 파일의 이미지 저장소에 들어가 있으므로 바로 렌더된다. (대안: ≤30KB면 A에서 `getBytesAsync()` → base64 → B에서 `figma.createImage(bytes)`.) `download_assets`는 화면 하나당 원본 이미지 20장까지만 주므로 이미지가 많은 화면은 하위 프레임 단위로 나눠 부른다.
4. 스크린샷으로 원본과 비교 (`get_screenshot` 두 장).

주의: `use_figma`에서 `setPluginData`·`createImageAsync`는 지원되지 않는다(도구 설명에 명시). `use_figma`는 오류가 나면 그 호출의 변경이 전부 취소된다(2번 실패 때 확인). 실행 환경에 `fetch` 없음. 코드 한도 50,000자.
