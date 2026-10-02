// Core 도우미 — 설치되는 껍데기(로더). 진짜 코드(code.js·ui.html)는 실행할 때마다 GitHub에서 받아 돌린다.
// 그래서 코드를 고쳐 푸시하면 다음 실행부터 반영되고, 재설치는 manifest.json(권한·허용 도메인)이 바뀔 때만 한다.
// 흐름: boot.html(UI)이 GitHub에서 code.js·ui.html 텍스트를 받아 여기로 보냄 → 이 파일이 code.js를 실행 → code.js가 진짜 UI를 띄움.

figma.showUI(__html__, { width: 420, height: 640, themeColors: true });

const G = (typeof globalThis === 'object' && globalThis) || Function('return this')();

figma.ui.onmessage = (msg) => {
  if (!msg || msg.type !== 'boot') return;
  if (!msg.code || !msg.ui) {
    figma.ui.postMessage({ type: 'boot-error', msg: msg.error || '코드를 받지 못했습니다' });
    return;
  }
  // code.js 가 figma.showUI(__CORE_UI__ || __html__) 로 진짜 UI를 띄운다
  G.__CORE_UI__ = msg.ui;
  G.__CORE_SOURCE__ = msg.source || null;
  try {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const run = new AsyncFunction(msg.code);
    run().catch((e) => figma.ui.postMessage({ type: 'boot-error', msg: '실행 중 오류: ' + ((e && e.stack) || e) }));
  } catch (e) {
    // 샌드박스가 원격 코드 실행을 막는 경우도 여기로 온다 → 이때는 로더 방식을 포기하고 code.js 를 직접 main 으로 설치한다
    figma.ui.postMessage({ type: 'boot-error', msg: '코드 실행 실패: ' + ((e && e.stack) || e) });
  }
};
