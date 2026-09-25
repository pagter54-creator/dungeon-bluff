import test from 'node:test';
import assert from 'node:assert/strict';

test('failed combat audio cannot skip card flips, duplicate shatter, attacks, damage, or screen shake', async () => {
  const saved = new Map(['document', 'Audio', 'matchMedia', 'addEventListener', 'requestAnimationFrame', 'innerWidth', 'innerHeight', 'devicePixelRatio'].map(key => [key, globalThis[key]]));
  const warnings = [];
  const previousWarn = console.warn;
  class Element {
    constructor() {
      this.style = {};
      this.dataset = {};
      this.children = [];
      this.classes = new Set();
      this.classList = { add: name => this.classes.add(name), remove: name => this.classes.delete(name), contains: name => this.classes.has(name), toggle: (name, on) => on ? this.classes.add(name) : this.classes.delete(name) };
    }
    append(...children) { this.children.push(...children); for (const child of children) child.parentNode = this; }
    insertBefore(child) { this.append(child); }
    remove() { this.removed = true; }
    removeAttribute() {}
    cloneNode() { return new Element(); }
    querySelector(selector) { return selector === '.reveal-value' ? (this.value ||= { textContent: '?' }) : null; }
    getBoundingClientRect() { return { left: 100, top: 100, width: 70, height: 100 }; }
    getAnimations() { return []; }
    animate() { return { finished: Promise.resolve(), cancel() {} }; }
  }
  const overlay = new Element();
  const cards = { one: new Element(), two: new Element(), knight: new Element() };
  const players = { one: new Element(), two: new Element(), knight: new Element() };
  for (const player of Object.values(players)) player.querySelector = selector => selector === 'h3' ? { textContent: 'Player' } : null;
  for (const player of Object.values(players)) player.querySelectorAll = () => [];
  let shakes = 0;
  const app = new Element();
  app.animate = () => { shakes++; return { finished: Promise.resolve(), cancel() {} }; };
  const health = { innerHTML: '', style: {} };
  try {
    globalThis.innerWidth = 1200;
    globalThis.innerHeight = 800;
    globalThis.devicePixelRatio = 1;
    globalThis.addEventListener = () => {};
    globalThis.requestAnimationFrame = () => 1;
    globalThis.matchMedia = () => ({ matches: false });
    globalThis.Audio = class { pause() {} };
    globalThis.document = {
      createElement: () => new Element(),
      querySelector(selector) {
        if (selector === '#fx-canvas') return { width: 0, height: 0, getContext: () => ({ setTransform() {}, clearRect() {} }) };
        if (selector === '#fx-overlay') return overlay;
        if (selector === '#app') return app;
        if (selector === '.enemy-health b' || selector === '.enemy-health .health-track i') return health;
        if (selector.startsWith('[data-reveal=')) return cards[selector.match(/"(.+)"/)[1]];
        if (selector.startsWith('[data-player=')) return players[selector.match(/"(.+)"/)[1]];
        return null;
      },
      querySelectorAll: () => [],
    };
    console.warn = (...args) => warnings.push(args);
    const [{ reveal }, { getAudio }] = await Promise.all([import('../src/fx.js'), import('../src/audio.js')]);
    getAudio().combatCue = () => { throw new Error('Web Audio unavailable'); };
    getAudio().tone = () => { throw new Error('Audio device unavailable'); };
    await reveal({
      turnIndex: 1,
      cards: [{ memberId: 'one', value: 3, valid: false }, { memberId: 'two', value: 3, valid: false }, { memberId:'knight',value:3,valid:true,resisted:true,skillUsed:true,skillId:'toughness' }],
      effects: [{ type: 'attack', memberId: 'one', amount: 4, attackFx: 'sword' }, { type: 'damage', memberId: 'two', amount: 1 }],
      monsterBefore: { hp: 10, maxHp: 10 }, monsterAfter: { hp: 10 },
      stage: { name: 'Test', category: 'monster', shape: 'boar' }, stageCleared: false,
    });
    assert.equal(cards.one.value.textContent, 3);
    assert.equal(cards.two.value.textContent, 3);
    assert.ok(cards.one.classes.has('revealed'));
    assert.ok(cards.one.classes.has('shattered'));
    assert.ok(cards.knight.classes.has('revealed'));
    assert.ok(cards.knight.classes.has('clash-resisted'));
    assert.ok(!cards.knight.classes.has('shattered'));
    assert.ok(overlay.children.some(child => child.className?.includes('character-projectile')));
    assert.ok(overlay.children.some(child => child.className?.includes('monster-projectile')));
    assert.ok(shakes > 0);
    assert.ok(warnings.length > 0);
  } finally {
    console.warn = previousWarn;
    for (const [key, value] of saved) {
      if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
    }
  }
});
