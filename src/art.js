import { MONSTER_IMAGES } from './monster-assets.js';
// Original code-native vector artwork. No external image dependencies.
export function dungeonArt() {
  return `<svg class="dungeon-art" viewBox="0 0 900 760" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs><linearGradient id="stone" x2="0" y2="1"><stop stop-color="#474050"/><stop offset="1" stop-color="#191824"/></linearGradient><radialGradient id="portal"><stop stop-color="#cabaed"/><stop offset=".3" stop-color="#73639f"/><stop offset=".7" stop-color="#302740"/><stop offset="1" stop-color="#13121e"/></radialGradient><linearGradient id="floor" x2="0" y2="1"><stop stop-color="#5c4569"/><stop offset="1" stop-color="#11111c"/></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="8"/></filter></defs>
  <ellipse cx="490" cy="665" rx="355" ry="72" fill="#8e68bb" opacity=".1"/>
  <path d="M87 640 191 321 256 263 265 114 415 52 578 93 643 235 711 265 813 640Z" fill="#171620"/>
  <path d="m218 570 23-283 63-53 4-98 128-46 126 43 12 111 70 40 18 286Z" fill="url(#stone)" stroke="#665968" stroke-width="2"/>
  <path d="M307 555V329a142 142 0 0 1 284 0v226Z" fill="#0d0d16" stroke="#8b758b" stroke-width="17"/>
  <path d="M324 552V329a125 125 0 0 1 250 0v223Z" fill="url(#portal)"/>
  <path d="M360 550V337a90 90 0 0 1 180 0v213Z" fill="#b19bd0" opacity=".1"/>
  <path d="m380 548 9-201 33-48 44 5 45 51 16 195" fill="#d3bbeb" opacity=".09"/>
  <path d="m430 346 18-28 22 29-22 51Z" fill="#e5cff4" opacity=".9" filter="url(#glow)"/><path d="m440 349 8-19 10 19-10 22Z" fill="#ead6ff"/>
  <g stroke="#a491a7" stroke-width="2" fill="none" opacity=".5"><path d="m269 282 40 4m-45 47 42 7m-46 51 48 3m-51 56 49 2m-52 60 55 1m285-223 35-5m-35 54 40-9m-40 65 45-4m-45 60 46-2m-47 58 54-3M331 213l21 22m20-58 17 38m43-53 2 34m48-32-9 35m53-13-22 36m52-11-32 22"/></g>
  <path d="m283 553 318 0 135 116H160Z" fill="url(#floor)"/><g stroke="#a887b6" opacity=".3"><path d="M258 578h372M224 607h438M183 643h515M353 555l-50 114m97-114-16 114m66-114 25 114m24-114 66 114"/></g>
  <g fill="#211d2a" stroke="#544556" stroke-width="2"><path d="m166 571 15-262 51-23 12 291Z"/><path d="m657 577 4-291 51 23 18 262Z"/><path d="m167 350 75-10v25l-76 10m492-35 60 10 2 25-62-10"/></g>
  <g fill="#c69467"><path d="m198 421-15-37h30Z"/><path d="m685 421-15-37h30Z"/></g>
  <g fill="#ffba78" filter="url(#glow)"><ellipse cx="198" cy="368" rx="18" ry="39"/><ellipse cx="686" cy="368" rx="18" ry="39"/></g><g fill="#ffd79c"><path d="m198 386-10-18 8-33 4 17 8 19Z"/><path d="m686 386-10-18 8-33 4 17 8 19Z"/></g>
  <g fill="#272231" stroke="#57495d"><path d="m430 135 18-38 25 39-24 29Z"/><path d="m138 586 42-13 40 42-72 9Z"/><path d="m665 614 42-49 55 24 18 42Z"/><path d="m279 659-31-24-36 8-10 25Z"/></g>
  <g fill="#d7b67e" opacity=".6"><circle cx="354" cy="422" r="2"/><circle cx="552" cy="464" r="2"/><circle cx="394" cy="297" r="2"/><circle cx="480" cy="513" r="1.5"/><circle cx="264" cy="214" r="2"/><circle cx="610" cy="356" r="2"/></g></svg>`;
}
export function creatureArt(shape = 'seer') {
  return '<img class="creature monster-illustration" src="'+(MONSTER_IMAGES[shape]||MONSTER_IMAGES.seer)+'" alt="" draggable="false" decoding="async">';
}
export function eventArt(category) {
  const inner = {
    treasure: '<path d="m70 113 20-41h120l20 41v91H70Z"/><path d="M70 120h160m-137 0v84m114-84v84"/><path d="M135 109h30v34h-30Z" class="bone"/>',
    trap: '<path d="m150 43 99 169H51Z"/><path d="M150 90v59m0 19v11" class="eye"/><path d="m49 215 202 0"/>',
    recovery: '<path d="M68 160q82 65 164 0l-22 57H90Z"/><ellipse cx="150" cy="154" rx="82" ry="25"/><path d="M150 40q-63 74-4 95 64-12 4-95Z" class="eye"/>',
    event: '<path d="M82 218V108a68 68 0 0 1 136 0v110Z"/><path d="M106 218V108a44 44 0 0 1 88 0v110"/><path d="m150 88 21 34-21 34-21-34Z" class="eye"/><path d="M138 180h24" class="bone"/>',
  };
  return `<svg class="creature event-art" viewBox="0 0 300 260" aria-hidden="true"><g fill="#262032" stroke="currentColor" stroke-width="3" stroke-linejoin="round">${inner[category] || inner.event}</g></svg>`;
}
