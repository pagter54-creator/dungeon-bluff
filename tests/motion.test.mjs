import test from 'node:test';
import assert from 'node:assert/strict';

test('device reduced-motion is visible and a player can opt into full combat effects', async () => {
  const saved = new Map(['document', 'localStorage', 'matchMedia'].map(key => [key, globalThis[key]]));
  const classes = new Set();
  const values = new Map();
  const button = {
    label: { textContent: '' },
    querySelector() { return this.label; },
    setAttribute(name, value) { this[name] = value; },
    addEventListener(name, callback) { this[name] = callback; },
  };
  const device = { matches: true, addEventListener(name, callback) { this[name] = callback; } };
  try {
    globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
    globalThis.matchMedia = () => device;
    globalThis.document = {
      documentElement: { classList: { toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); } } },
      querySelector: selector => selector === '#motion' ? button : null,
    };
    const { motionPreference, getMotionMode, initMotionControl, setMotionMode } = await import('../src/motion.js');
    initMotionControl();
    assert.equal(getMotionMode(), 'auto');
    assert.equal(motionPreference.matches, true);
    assert.equal(button.label.textContent, '연출 간소');
    assert.ok(classes.has('motion-reduced'));

    button.click();
    assert.equal(getMotionMode(), 'full');
    assert.equal(values.get('dungeon-bluff.motion'), 'full');
    assert.equal(motionPreference.matches, false);
    assert.equal(button.label.textContent, '연출 전체');
    assert.ok(!classes.has('motion-reduced'));

    device.matches = false;
    device.change();
    assert.equal(motionPreference.matches, false);
    setMotionMode('reduced');
    assert.ok(classes.has('motion-reduced'));
    setMotionMode('auto');
    assert.equal(motionPreference.matches, false);
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
    }
  }
});
