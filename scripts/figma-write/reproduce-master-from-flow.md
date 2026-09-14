# 절차 — 기준 문서(플로우 페이지)에서 마스터 페이지를 "복붙 + 원본 대조"로 재현하기 (유형 A/B 실행 검증용)

> 2026-09-14 세션 6 작성. **아직 실행 전** — `[Core] 로그인/온보딩`(`irS8OlYuyQmW0aL4DR3cy5`)에 브랜치 "Core 도우미"가 생기면 그 브랜치 키로 돌린다. Core 본 파일에는 절대 돌리지 않는다.
> 짝표(원본 ↔ 손 결과)는 `docs/verify-2026-09-14-login-onboarding.md` §2. 아래 코드의 `MAP` 이 그 표다.

## 0. 원칙

- 화면은 새로 그리지 않는다. 같은 파일 안 원본 프레임을 `clone()` 해서 새 페이지의 섹션에 넣는다 (지침서 §0-6 복붙).
- 복제 직후 원본과 대조해 크기·좌표를 원본 값으로 되돌린다 (`clone()` 뒤 HUG 재계산으로 폭이 바뀌는 경우가 있음 — 세션 5 기술 사실).
- 한 번의 `use_figma` 호출은 페이지 전환 1회, 논리 작업 10개 안팎. 아래 4묶음으로 나눈다.
- 모든 호출은 만들거나 바꾼 노드 ID를 돌려준다. 확인 스크린샷은 마지막에 1장(1200px)만.

## 1. 뼈대 (호출 1)

```js
// 브랜치 키로 실행. Cover · --- 다음 자리에 페이지 생성
const page = figma.createPage();
page.name = '🌏 마스터 파일 (도우미 재현)';
figma.root.insertChild(2, page);
await figma.setCurrentPageAsync(page);
const root = figma.createSection(); root.name = '🌏 로그인/회원가입'; root.x = 0; root.y = 0; root.resizeWithoutConstraints(8120, 3974);
root.fills = [{type:'SOLID', color:{r:20/255,g:21/255,b:23/255}}]; root.cornerRadius = 60;
page.appendChild(root);
const mk = (name,x,y,w,h)=>{ const s=figma.createSection(); s.name=name; s.x=x; s.y=y; s.resizeWithoutConstraints(w,h); s.fills=[{type:'SOLID',color:{r:34/255,g:35/255,b:38/255}}]; s.cornerRadius=60; root.appendChild(s); return s; };
const app = mk('APP', 80, 320, 4565, 1120);
const web = mk('WEB', 80, 1500, 7960, 2394);
return { pageId: page.id, rootId: root.id, appId: app.id, webId: web.id };
```

## 2. 화면 복제 — APP 11장 (호출 2), WEB 11장 (호출 3)

`MAP` 은 [원본 id, 손 결과 이름, 손 결과 x, y] (좌표는 섹션 기준). 원본은 `🌊 플로우_26.05 기준` 페이지(`2:17`)에 있으므로 **원본 페이지에서 복제한 뒤 재현 페이지 섹션으로 옮긴다** — `clone()` 은 현재 페이지 제한이 없고, `appendChild` 로 다른 페이지 섹션에 붙는다(세션 5 확인).

```js
const APP_SEC = '<호출 1의 appId>';
const MAP = [
  ['25:54713','로그인/가입 시작',60,248], ['25:54698','이메일 입력',467,248], ['25:54673','가입 시작 안내',874,248],
  ['25:54996','이름 입력',1281,248], ['25:55304','비밀번호 입력',1688,248], ['25:55461','비밀번호 재입력',2095,248],
  ['25:55776','약관 동의 - 전체 동의',2502,248], ['25:55852','약관 동의 - 선택 제외',2909,248],
  ['25:56006','이메일 인증',3316,248], ['25:56114','이메일 인증 - 시간 초과',3723,248], ['25:56169','가입 완료',4130,248],
];
const flow = await figma.getNodeByIdAsync('2:17');
await figma.setCurrentPageAsync(flow);
const sec = await figma.getNodeByIdAsync(APP_SEC);
const made = [];
for (const [srcId, name, x, y] of MAP) {
  const src = await figma.getNodeByIdAsync(srcId);
  const w = src.width, h = src.height, n0 = src.findAll(()=>true).length;
  const c = src.clone(); sec.appendChild(c); c.name = name; c.x = x; c.y = y;
  if (Math.round(c.width)!==Math.round(w) || Math.round(c.height)!==Math.round(h)) c.resize(w, h);
  made.push({id:c.id, name, w:Math.round(c.width), h:Math.round(c.height), n:c.findAll(()=>true).length, n0});
}
return { createdNodeIds: made.map(m=>m.id), made };
```

WEB 은 `MAP` 을 아래로 바꿔 같은 코드를 돌린다 (섹션 = webId):

```
['25:70005','로그인/가입 방법 선택',60,248], ['25:69064','이메일 입력',1372,248], ['25:69058','가입 시작 안내',2684,248],
['25:69163','이름 입력',3996,248], ['25:69385','비밀번호 입력',5308,248], ['25:69759','비밀번호 재입력',6620,248],
['25:69834','약관 동의 - 전체 동의',60,1354], ['25:69911','약관 동의 - 선택 제외',1372,1354],
['25:70083','이메일 인증',2684,1354], ['25:70163','이메일 인증 - 시간 초과',3996,1354], ['25:70293','가입 완료',5308,1354]
```

`n`(복제본 자손 수) ≠ `n0`(원본 자손 수)면 그 장은 실패 → 보고하고 멈춘다.

## 3. 설명 바 24개 + 링크 카드 (호출 4)

손 결과 페이지(`89:21432`)의 바 인스턴스와 링크 카드를 복제해 같은 좌표에 둔다. 바는 ⚪️ "APP"(`94:22997`)·"WEB"(`94:23188`) 2개와 🔵 22개(`94:23003`…`94:23177`, `94:23194`…`94:23304`), 링크 카드는 `91:7`. 복제 뒤 바 폭이 바뀌면 `layoutSizingHorizontal='FIXED'` + `resize(원본 폭, 62)`. 🔵 바에는 폭 범위 설명(APP ~599 / WEB ~1280)을 넣는 규칙(지침서 §6-2)이 있으나, **이 검증은 손 결과와 같은지 보는 것이 목적이라 손 결과 그대로 복제**한다.

## 4. 대조 (호출 5, 읽기 전용)

재현 페이지와 손 결과 페이지를 각각 읽어(페이지당 호출 1, 병렬) 프레임 22장 + 바 24개 + 카드 1개를 이름·크기·좌표·자손 수로 비교한다. 차이 0 → 통과. 통과하면 규약 §2의 A/B 분기를 연다. 확인 스크린샷은 재현 페이지 루트 섹션 1장(1200px).

## 5. 뒷정리

- 재현 페이지는 브랜치에 남겨 둔다(Ken 확인용). 본 파일 머지는 하지 않는다 — 이 페이지는 검증용이지 Core 의 일부가 아니다.
- 결과를 `docs/verify-2026-09-14-login-onboarding.md` §4 와 워크로그에 적는다.
