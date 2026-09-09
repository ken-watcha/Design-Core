// [읽기 전용] 스펙 링크 카드 프레임의 텍스트와 하이퍼링크를 읽는다 (기준 문서가 어디인지 확인용).
// PAGE_ID(마스터 페이지)와 CARD_ID(링크 카드 프레임)를 바꿔서 use_figma에 붙여넣기.
const PAGE_ID = "89:21432";
const CARD_ID = "91:7";

const page = await figma.getNodeByIdAsync(PAGE_ID);
await figma.setCurrentPageAsync(page);
const card = await figma.getNodeByIdAsync(CARD_ID);
return {
  name: card.name,
  children: card.children.map(c => ({ id: c.id, type: c.type, name: c.name })),
  texts: card.findAll(x => x.type === 'TEXT').map(x => ({ id: x.id, chars: x.characters.slice(0, 200), link: x.hyperlink ? x.hyperlink : null }))
};
