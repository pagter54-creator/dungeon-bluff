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
    try {
      void voice.play().catch(() => { this.voices.delete(voice); this.missingSfx.add(name); fallback?.(); });
    } catch {
      this.voices.delete(voice); this.missingSfx.add(name); fallback?.();
    }
  }
  combatCue(name) {
    if (!this.enabled || !this.volume || this.hidden || !this.context || !this.master) return;
    // Synthesized cues are immediate: no audio-file request during combat.
    const cues={
      flip:{noise:[.14,2400,.09],tones:[[640,.09,'triangle',.045,1150]]},
      reveal:{noise:[.07,3800,.055],tones:[[880,.16,'sine',.055,1200],[1320,.2,'sine',.025,1500]]},
      crack:{noise:[.24,3100,.16],tones:[[210,.16,'square',.035,45],[1500,.12,'triangle',.035,180]]},
      launch:{noise:[.19,1400,.065],tones:[[180,.16,'sine',.025,620]]},
      hit:{noise:[.13,1200,.13],tones:[[125,.17,'sine',.12,35]]},
      heavy:{noise:[.24,850,.17],tones:[[90,.29,'sine',.15,25],[260,.1,'triangle',.045,65]]},
      hurt:{noise:[.19,1700,.12],tones:[[165,.21,'triangle',.09,45]]},
      skill_gold_bonus:{noise:[.07,3800,.025],tones:[[1100,.18,'sine',.04,1700]]},
      skill_toughness:{noise:[.11,1000,.045],tones:[[450,.22,'triangle',.045,800]]},
      skill_low_card_gold:{noise:[.08,2200,.03],tones:[[800,.19,'triangle',.04,1350]]},
      skill_amplify:{noise:[.13,2000,.035],tones:[[440,.24,'sine',.045,1250]]},
      skill_blood_heat:{noise:[.13,650,.045],tones:[[160,.22,'triangle',.05,330]]},
      skill_revelation:{noise:[.1,3800,.02],tones:[[1400,.24,'sine',.035,2000]]},
      skill_score_steal:{noise:[.09,1800,.03],tones:[[950,.2,'triangle',.04,430]]},
      skill_random_hand:{noise:[.09,2600,.035],tones:[[340,.18,'triangle',.04,780]]},
      gunshot:{noise:[.12,3200,.09],tones:[[160,.13,'sawtooth',.055,45]]},
      punch:{noise:[.1,600,.08],tones:[[115,.14,'triangle',.065,35]]},
      kick:{noise:[.15,850,.08],tones:[[85,.2,'triangle',.07,28]]},
      punch_whoosh:{noise:[.09,2400,.035],tones:[]},
      kick_whoosh:{noise:[.19,1800,.045],tones:[]},
      skill_full_burst:{noise:[.15,2200,.06],tones:[[550,.2,'square',.035,1000]]},
      skill_combo:{noise:[.12,800,.05],tones:[[220,.2,'triangle',.05,480]]},
    };
    const cue=cues[name];if(!cue)return;
    for(const args of cue.tones)this.tone(...args);
    const [duration,frequency,volume]=cue.noise,ctx=this.context;
    if(!this.noiseBuffer){
      this.noiseBuffer=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);
      const data=this.noiseBuffer.getChannelData(0);
      for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    }
    const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),now=ctx.currentTime;
    source.buffer=this.noiseBuffer;filter.type='bandpass';filter.Q.value=.7;
    filter.frequency.setValueAtTime(frequency,now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(120,frequency*.25),now+duration);
    gain.gain.setValueAtTime(.001,now);gain.gain.linearRampToValueAtTime(volume,now+.008);
    gain.gain.exponentialRampToValueAtTime(.001,now+duration);
    source.connect(filter);filter.connect(gain);gain.connect(this.master);
    source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
    source.start();source.stop(now+duration);
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
export const playTone = (...args) => {
  try { getAudio().tone(...args); } catch { /* An audio-device failure must not stop combat visuals. */ }
};

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
