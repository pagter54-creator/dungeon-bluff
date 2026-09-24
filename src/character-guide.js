import { CHARACTER_CATALOG } from './character-guide-data.js';
import { skinPortrait } from './skins.js';
import { deckLabel, html } from './character-ui.js';

const order=['adventurer','warrior','rogue','mage','berserker','seer','imp','gambler','gunner','fighter','vampire','demonsword'];

export function characterGuide(){
  return `<div class="eyebrow">ADVENTURER CODEX</div><h2>직업 도감</h2><p>모든 직업의 기본 카드와 스킬을 살펴보세요. 같은 숫자를 제출하면 카드 효과가 무효가 됩니다.</p><div class="character-guide-list">${order.map(id=>{
    const character=CHARACTER_CATALOG[id];
    const skill=character.definition.skill;
    const cards=character.deck;
    const type=skill.type==='hybrid'?'패시브 · 액티브':skill.type==='active'?'액티브':'패시브';
    return `<article class="character-guide-entry" style="--character-color:${html(character.definition.color)}"><div class="character-guide-heading"><span class="character-guide-portrait">${skinPortrait(id)}</span><div><h3>${html(character.display_name)}</h3><small>${html(character.definition.role)}</small></div></div><div class="character-guide-deck"><b>카드 구성</b><div class="character-guide-cards">${cards.map(value=>`<span>${value}</span>`).join('')}</div><small>${html(deckLabel(character))}</small></div><div class="character-guide-skill"><b>${html(type)} · ${html(skill.name)}</b><p>${html(skill.description)}</p></div></article>`;
  }).join('')}</div>`;
}
