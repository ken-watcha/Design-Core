// 📍 작업 위치: 판별 결과에 따라 "어디서 작업할지" 제안하고, 사람이 준 링크가 그 자리가 맞는지 검사한다.
// 새 Core = 프로젝트 파일의 복제본 / 기존 Core 갱신 = 그 Core 파일의 브랜치(이름 자유, 2026-10-12 윤우). 원본·Core 본 파일에는 쓰지 않는다.

function parseLink(url) {
  const m = /figma\.com\/(?:design|file)\/([0-9A-Za-z]{22,128})(?:\/branch\/([0-9A-Za-z]{22,128}))?/.exec(url || '');
  return m ? { fileKey: m[1], branchKey: m[2] || null, workKey: m[2] || m[1] } : null;
}

function proposePlace(verdict, sourceUrl, sourceKey) {
  if (verdict.suggestion === 'update') {
    const core = verdict.candidates[0] || {};
    return {
      kind: 'branch', coreName: verdict.target, coreKey: core.key, coreUrl: core.url,
      steps: [`${verdict.target} 파일을 엽니다`, '파일 이름 옆 ⌄ → Create branch → 이름은 자유 (예: 이번 프로젝트 이름. 이미 만든 브랜치가 있으면 그걸 엽니다)', '브랜치 안의 내용은 지우지 않고 그대로 둡니다 (앱이 그 안의 화면만 고칩니다)', '브랜치 링크를 아래 칸에 붙여 넣습니다'],
      why: '기존 Core는 본 파일에 직접 쓰지 않고 브랜치에서 고친 뒤 사람이 확인하고 합칩니다'
    };
  }
  return {
    kind: 'duplicate', coreName: verdict.target, sourceUrl, sourceKey,
    steps: ['프로젝트 파일 이름 옆 ⌄ → Duplicate', `복사본 이름을 "${verdict.target}"로 바꿉니다 (폴더 이동은 나중에 해도 됩니다)`, '복사본 링크를 아래 칸에 붙여 넣습니다'],
    why: '원본 프로젝트 문서는 기준 문서로 그대로 두고, 복제본을 깎아 Core로 만듭니다 (Figma는 프로그램에 파일 간 복사를 열어 주지 않음)'
  };
}

// 링크 모양만으로 할 수 있는 검사 (Figma를 읽기 전)
function checkLink(place, url) {
  const l = parseLink(url);
  if (!l) return { ok: false, why: 'Figma 디자인 파일 링크가 아닙니다' };
  if (place.kind === 'branch') {
    // 브랜치 링크는 두 모양이 있다: …/design/<Core 키>/branch/<브랜치 키>/… 와 …/design/<브랜치 키>/<브랜치 이름> (Ken 2026-10-12)
    if (l.branchKey) {
      if (place.coreKey && l.fileKey !== place.coreKey) return { ok: false, why: `${place.coreName}의 브랜치가 아닙니다 (다른 파일의 브랜치)` };
      return { ok: true, workKey: l.branchKey };
    }
    if (place.coreKey && l.fileKey === place.coreKey) return { ok: false, why: `${place.coreName} 본 파일입니다. 본 파일에는 쓰지 않습니다 — 브랜치를 만들고 그 링크를 주세요` };
    return { ok: true, workKey: l.fileKey, unverifiedBranch: true };
  }
  if (l.branchKey) return { ok: false, why: '브랜치가 아니라 프로젝트 파일을 Duplicate한 복사본 링크가 필요합니다' };
  if (l.fileKey === place.sourceKey) return { ok: false, why: '원본 프로젝트 문서입니다. Duplicate한 복사본 링크를 주세요 (원본에는 쓰지 않습니다)' };
  return { ok: true, workKey: l.fileKey };
}

module.exports = { proposePlace, checkLink, parseLink };
