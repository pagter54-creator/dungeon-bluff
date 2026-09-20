const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
const VOLUME_KEY = 'dungeon-bluff.volume';
const BGM_GAIN = 0.5;
const SFX_GAIN = 2;
const TRACKS = {
  lobby: new URL('../bgm_lobby.mp3', import.meta.url).href,
  dungeon: new URL('../bgm_dungeon.mp3', import.meta.url).href,
};

export class GameAudio {
  constructor({ music, createContext, storage } = {}) {
    this.scene = 'lobby';
    this.music = music || new Audio();
    this.music.src = TRACKS[this.scene];
    this.music.loop = true;
    this.music.preload = 'none';
    this.createContext = createContext || (() => new (window.AudioContext || window.webkitAudioContext)());
    try { this.storage = storage || globalThis.localStorage; } catch { this.storage = null; }
    let saved;
    try { saved = this.storage?.getItem(VOLUME_KEY); } catch { /* Private browsing may block storage. */ }
    this.volume = saved == null ? .5 : clamp(saved);
    this.previousVolume = this.volume || .5;
    this.enabled = false;
    this.hidden = false;
    this.voices = new Set();
    this.missingSfx = new Set();
    this.music.volume = this.volume * BGM_GAIN;
  }
  async activate() {
    this.enabled = true;
    if (!this.context) {
      try {
        this.context = this.createContext();
        this.master = this.context.createGain();
        this.master.gain.value = this.volume * SFX_GAIN;
        this.master.connect(this.context.destination);
      } catch { /* BGM can still work without Web Audio effects. */ }
    }
    // Call play() and resume() before awaiting either, while the gesture is live.
    const pending = [this.syncMusic()];
    if (this.context?.state === 'suspended') pending.push(this.context.resume());
    await Promise.allSettled(pending);
  }
  async syncMusic() {
    this.music.volume = this.volume * BGM_GAIN;
    if (!this.enabled || !this.volume || this.hidden) { this.music.pause(); return; }
    try { if (this.music.paused) await this.music.play(); }
    catch { /* Missing music or blocked autoplay never interrupts the game. */ }
  }
  async setScene(scene) {
    if (!Object.hasOwn(TRACKS, scene) || scene === this.scene) return;
    this.scene = scene;
    this.music.pause();
    this.music.src = TRACKS[scene];
    this.music.currentTime = 0;
    await this.syncMusic();
  }
  setVolume(value) {
    this.volume = clamp(value);
    if (this.volume) this.previousVolume = this.volume;
    if (this.master) this.master.gain.setTargetAtTime(this.volume * SFX_GAIN, this.context.currentTime, .025);
    for (const voice of this.voices) voice.volume = clamp(this.volume * SFX_GAIN);
    try { this.storage?.setItem(VOLUME_KEY, String(this.volume)); } catch { /* Optional preference. */ }
    void this.syncMusic();
  }
  toggleMute() { this.setVolume(this.volume ? 0 : this.previousVolume); }
  setHidden(hidden) { this.hidden = hidden; if (hidden) { for (const voice of this.voices) voice.pause(); this.voices.clear(); } void this.syncMusic(); }
  playSfx(name, fallback) {
    if (!this.enabled || !this.volume || this.hidden) return;
    if (!/^sfx_[a-z_]+$/.test(name) || this.missingSfx.has(name)) { fallback?.(); return; }
    let voice;
    try { voice = new Audio(new URL(`../${name}.mp3`, import.meta.url).href); }
    catch { fallback?.(); return; }
    voice.volume = clamp(this.volume * SFX_GAIN); this.voices.add(voice);
    voice.onended = () => this.voices.delete(voice);
    void voice.play().catch(() => { this.voices.delete(voice); this.missingSfx.add(name); fallback?.(); });
  }
  tone(freq = 180, duration = .2, type = 'sine', volume = .08, end = 40) {
    if (!this.enabled || !this.volume || this.hidden || !this.context || !this.master) return;
    const osc = this.context.createOscillator(), gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(end, 1), this.context.currentTime + duration);
    gain.gain.setValueAtTime(volume, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, this.context.currentTime + duration);
    osc.connect(gain); gain.connect(this.master);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    osc.start(); osc.stop(this.context.currentTime + duration);
  }
}

let shared;
export const getAudio = () => shared ||= new GameAudio();
export const playTone = (...args) => getAudio().tone(...args);

export function initAudioControls() {
  const audio = getAudio();
  const button = document.querySelector('#sound');
  const panel = document.querySelector('#sound-panel');
  const slider = document.querySelector('#volume');
  const output = document.querySelector('#volume-value');
  const mute = document.querySelector('#sound-mute');
  const render = () => {
    const percent = Math.round(audio.volume * 100);
    slider.value = percent; output.textContent = `${percent}%`;
    slider.setAttribute('aria-valuetext', `${percent}%`);
    button.querySelector('span').textContent = audio.enabled && percent ? `${percent}%` : 'OFF';
    mute.textContent = percent ? '음소거' : '소리 켜기';
    mute.setAttribute('aria-pressed', String(!percent));
  };
  const close = () => { panel.hidden = true; button.setAttribute('aria-expanded', 'false'); };
  // Start only after a real user gesture, respecting browser autoplay policy.
  const unlock = () => { void audio.activate().then(render); };
  document.addEventListener('pointerdown', unlock, { once: true });
  document.addEventListener('keydown', unlock, { once: true });
  button.addEventListener('click', () => {
    const opening = panel.hidden;
    panel.hidden = !opening; button.setAttribute('aria-expanded', String(opening));
    if (opening) { void audio.activate().then(render); slider.focus(); }
  });
  slider.addEventListener('input', () => { audio.setVolume(Number(slider.value) / 100); render(); });
  mute.addEventListener('click', () => { audio.toggleMute(); void audio.activate().then(render); render(); });
  document.addEventListener('click', e => { if (!e.target.closest('.sound-control')) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) { close(); button.focus(); } });
  document.addEventListener('visibilitychange', () => audio.setHidden(document.hidden));
  audio.setHidden(document.hidden);
  render();
}
