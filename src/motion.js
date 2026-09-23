const KEY = 'dungeon-bluff.motion';
const device = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
const deviceReduced = () => device?.matches ?? globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
let choice = 'auto';
try {
  const saved = globalThis.localStorage?.getItem(KEY);
  if (saved === 'full' || saved === 'reduced') choice = saved;
} catch { /* Private browsing may block preferences. */ }

export const motionPreference = {
  get matches() { return choice === 'reduced' || (choice === 'auto' && deviceReduced()); },
};
export const getMotionMode = () => choice;

function render() {
  globalThis.document?.documentElement?.classList.toggle('motion-reduced', motionPreference.matches);
  const button = globalThis.document?.querySelector('#motion');
  if (!button) return;
  const reduced = motionPreference.matches;
  button.querySelector('span').textContent = reduced ? '연출 간소' : '연출 전체';
  button.setAttribute('aria-pressed', String(!reduced));
  button.title = reduced
    ? '전투 연출이 간소화되어 있습니다. 누르면 카드 뒤집기와 화면 흔들림을 켭니다.'
    : '전투 연출이 모두 켜져 있습니다. 누르면 움직임을 줄입니다.';
}

export function setMotionMode(mode) {
  if (!['auto', 'full', 'reduced'].includes(mode)) return;
  choice = mode;
  try { globalThis.localStorage?.setItem(KEY, mode); } catch { /* Preference remains active for this page. */ }
  render();
}

export function initMotionControl() {
  const button = document.querySelector('#motion');
  button?.addEventListener('click', () => setMotionMode(motionPreference.matches ? 'full' : 'reduced'));
  device?.addEventListener?.('change', render);
  render();
}

render();
