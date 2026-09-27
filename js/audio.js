/* 音樂與音效：Web Audio 即時合成（原創旋律），不需外部音檔 */
const AUDIO = (() => {
  const PREF_KEY = 'op_voyage_audio_v1';
  let pref = { music: .55, sfx: .8, muted: false };
  try { Object.assign(pref, JSON.parse(localStorage.getItem(PREF_KEY) || '{}')); } catch (e) { }
  let ctx = null, master, musicBus, sfxBus, ambBus, noiseBuf, verb;
  let song = null, songName = null, nextTime = 0, step = 0, timer = null, ambNodes = [], ambName = null, pending = null;

  function init() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = pref.muted ? 0 : 1;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = pref.music * .5; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = pref.sfx; sfxBus.connect(master);
    ambBus = ctx.createGain(); ambBus.gain.value = pref.music * .5; ambBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // 簡易殘響
    verb = ctx.createConvolver(); const len = ctx.sampleRate * 1.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const ch = ir.getChannelData(c); for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    verb.buffer = ir; const vg = ctx.createGain(); vg.gain.value = .22; verb.connect(vg); vg.connect(musicBus);
    return true;
  }
  function unlock() { if (!init()) return; if (ctx.state === 'suspended') ctx.resume(); if (pending) { const p = pending; pending = null; playSong(p.name); } if (ambPending) { const a = ambPending; ambPending = null; ambient(a); } }
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, unlock, { capture: true }));
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  const n2m = s => { const m = /^([A-G][#b]?)(-?\d)$/.exec(s); return m ? NOTE[m[1]] + (+m[2] + 1) * 12 : null; };
  function parse(str) { // "D5:2 F#5 -:2" -> [{step,m,len}]
    const out = []; let t = 0;
    str.trim().split(/\s+/).forEach(tok => { if (tok === '|') return; const [n, l] = tok.split(':'); const len = +(l || 1); if (n !== '-') out.push({ s: t, m: n.split('+').map(n2m), len }); t += len; });
    return { notes: out, length: t };
  }

  /* ---------- 樂器 ---------- */
  function env(g, t, a, peak, d, sus, r, dur) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(Math.max(.0001, peak * sus), t + a + d); g.gain.setValueAtTime(Math.max(.0001, peak * sus), t + Math.max(a + d, dur)); g.gain.exponentialRampToValueAtTime(.0001, t + Math.max(a + d, dur) + r); return t + Math.max(a + d, dur) + r; }
  function osc(type, f, t, end, dest, detune) { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (detune) o.detune.value = detune; o.connect(dest); o.start(t); o.stop(end + .05); return o; }
  const INST = {
    lead(t, f, dur, v, bus) { const g = ctx.createGain(); g.connect(bus); g.connect(verb); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200; lp.connect(g); const e = env(g, t, .01, .16 * v, .08, .6, .12, dur); const o = osc('square', f, t, e, lp); const vib = ctx.createOscillator(); vib.frequency.value = 5.5; const vg = ctx.createGain(); vg.gain.value = f * .006; vib.connect(vg); vg.connect(o.frequency); vib.start(t + .12); vib.stop(e); },
    accordion(t, f, dur, v, bus) { const g = ctx.createGain(); g.connect(bus); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1900; lp.Q.value = 2; lp.connect(g); const e = env(g, t, .03, .07 * v, .1, .75, .08, dur); osc('sawtooth', f, t, e, lp, -7); osc('sawtooth', f, t, e, lp, 7); },
    bass(t, f, dur, v, bus) { const g = ctx.createGain(); g.connect(bus); const e = env(g, t, .005, .34 * v, .12, .45, .06, dur); osc('triangle', f, t, e, g); const g2 = ctx.createGain(); g2.gain.value = .25; g2.connect(g); osc('square', f, t, e, g2); },
    pluck(t, f, dur, v, bus) { const g = ctx.createGain(); g.connect(bus); g.connect(verb); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(5000, t); lp.frequency.exponentialRampToValueAtTime(700, t + .3); lp.connect(g); const e = env(g, t, .003, .2 * v, .35, .001, .05, .05); osc('sawtooth', f, t, e + .3, lp); osc('triangle', f * 2, t, e + .3, lp); },
    bell(t, f, dur, v, bus) { const g = ctx.createGain(); g.connect(bus); g.connect(verb); const e = env(g, t, .002, .16 * v, 1.2, .001, .1, .02); osc('sine', f, t, e + 1, g); const g2 = ctx.createGain(); g2.gain.value = .35; g2.connect(g); osc('sine', f * 2.76, t, e + 1, g2); },
    pad(t, f, dur, v, bus) { const g = ctx.createGain(); g.connect(bus); g.connect(verb); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; lp.connect(g); const e = env(g, t, .35, .05 * v, .2, .8, .5, dur); osc('sawtooth', f, t, e, lp, -9); osc('sawtooth', f, t, e, lp, 9); osc('triangle', f / 2, t, e, lp); },
    horn(t, f, dur, v, bus) { const g = ctx.createGain(); g.connect(bus); g.connect(verb); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(400, t); lp.frequency.linearRampToValueAtTime(1500, t + .15); lp.connect(g); const e = env(g, t, .08, .12 * v, .1, .8, .2, dur); osc('sawtooth', f, t, e, lp); osc('sawtooth', f * 1.005, t, e, lp); },
    oud(t, f, dur, v, bus) { const g = ctx.createGain(); g.connect(bus); g.connect(verb); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 2; bp.Q.value = 1.2; bp.connect(g); const e = env(g, t, .002, .5 * v, .5, .001, .05, .05); osc('sawtooth', f, t, e + .4, bp); osc('square', f * 1.003, t, e + .4, bp); }
  };
  function noise(t, dur, dest) { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.connect(dest); s.start(t, Math.random()); s.stop(t + dur); return s; }
  const DRUM = {
    kick(t, v, bus) { const g = ctx.createGain(); g.connect(bus); g.gain.setValueAtTime(.9 * v, t); g.gain.exponentialRampToValueAtTime(.001, t + .35); const o = ctx.createOscillator(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + .18); o.connect(g); o.start(t); o.stop(t + .4); },
    snare(t, v, bus) { const g = ctx.createGain(); g.connect(bus); g.connect(verb); g.gain.setValueAtTime(.45 * v, t); g.gain.exponentialRampToValueAtTime(.001, t + .18); const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1400; hp.connect(g); noise(t, .2, hp); const g2 = ctx.createGain(); g2.gain.setValueAtTime(.3 * v, t); g2.gain.exponentialRampToValueAtTime(.001, t + .1); g2.connect(bus); osc('triangle', 190, t, t + .1, g2); },
    hat(t, v, bus) { const g = ctx.createGain(); g.connect(bus); g.gain.setValueAtTime(.16 * v, t); g.gain.exponentialRampToValueAtTime(.001, t + .05); const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000; hp.connect(g); noise(t, .06, hp); },
    shaker(t, v, bus) { const g = ctx.createGain(); g.connect(bus); g.gain.setValueAtTime(.001, t); g.gain.linearRampToValueAtTime(.1 * v, t + .03); g.gain.exponentialRampToValueAtTime(.001, t + .09); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 6000; bp.connect(g); noise(t, .1, bp); },
    tom(t, v, bus, f) { const g = ctx.createGain(); g.connect(bus); g.connect(verb); g.gain.setValueAtTime(.6 * v, t); g.gain.exponentialRampToValueAtTime(.001, t + .4); const o = ctx.createOscillator(); o.frequency.setValueAtTime(f || 110, t); o.frequency.exponentialRampToValueAtTime((f || 110) * .55, t + .3); o.connect(g); o.start(t); o.stop(t + .45); },
    doum(t, v, bus) { DRUM.tom(t, v * .8, bus, 90); },
    tek(t, v, bus) { const g = ctx.createGain(); g.connect(bus); g.gain.setValueAtTime(.3 * v, t); g.gain.exponentialRampToValueAtTime(.001, t + .06); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2500; bp.Q.value = 3; bp.connect(g); noise(t, .07, bp); }
  };
  // 和弦名稱 -> 音高
  const CH = { maj: [0, 4, 7], min: [0, 3, 7], dom7: [0, 4, 7, 10], sus: [0, 5, 7] };
  function chord(root, q, oct) { const r = n2m(root + (oct || 3)); return (CH[q] || CH.maj).map(i => r + i); }

  /* ---------- 曲目（全部原創） ---------- */
  const SONGS = {
    title: { bpm: 104, beat: 3, bars: 8, tracks: [
      { inst: 'lead', v: 1, seq: 'A4:2 D5 D5:2 E5 | F#5:2 E5 D5:2 B4 | A4:2 B4 D5:2 F#5 | E5:6 | A5:2 F#5 D5:2 E5 | F#5:2 G5 A5:2 F#5 | G5:2 E5 C#5:2 E5 | D5:6' },
      { inst: 'accordion', chords: [['D', 'maj'], ['B', 'min'], ['G', 'maj'], ['A', 'maj'], ['D', 'maj'], ['D', 'maj'], ['A', 'dom7'], ['D', 'maj']], pattern: [3], len: 2, oct: 4 },
      { inst: 'bass', roots: ['D2', 'B1', 'G1', 'A1', 'D2', 'F#2', 'A1', 'D2'], pattern: [0], len: 2 },
      { drum: 'kick', hits: [0], v: .7 }, { drum: 'shaker', hits: [0, 1, 2, 3, 4, 5], v: .8 }, { drum: 'snare', hits: [3], v: .35 }] },
    map: { bpm: 84, beat: 3, bars: 8, tracks: [
      { inst: 'pluck', arp: [['D', 'maj'], ['B', 'min'], ['G', 'maj'], ['A', 'maj'], ['D', 'maj'], ['G', 'maj'], ['A', 'dom7'], ['D', 'maj']], oct: 4, v: .9 },
      { inst: 'bell', v: .7, seq: 'F#5:6 | D5:6 | B4:3 D5:3 | C#5:6 | A5:6 | G5:3 B5:3 | A5:3 E5:3 | D5:6' },
      { inst: 'bass', roots: ['D2', 'B1', 'G1', 'A1', 'D2', 'G1', 'A1', 'D2'], pattern: [0], len: 5, v: .7 }] },
    east: { bpm: 112, beat: 3, bars: 8, tracks: [
      { inst: 'accordion', v: 1.4, seq: 'D5:2 F#5 A5:2 F#5 | G5:2 B5 A5:3 | F#5:2 D5 E5:2 F#5 | E5:3 A4:3 | D5:2 F#5 A5:2 B5 | A5:2 F#5 D5:3 | E5:2 G5 F#5:2 E5 | D5:6' },
      { inst: 'pluck', chords: [['D', 'maj'], ['G', 'maj'], ['D', 'maj'], ['A', 'maj'], ['D', 'maj'], ['B', 'min'], ['A', 'dom7'], ['D', 'maj']], pattern: [0, 3], len: 1, oct: 3, v: .7 },
      { inst: 'bass', roots: ['D2', 'G1', 'D2', 'A1', 'D2', 'B1', 'A1', 'D2'], pattern: [0, 3], len: 2 },
      { drum: 'kick', hits: [0, 3], v: .5 }, { drum: 'shaker', hits: [1, 2, 4, 5], v: .7 }] },
    alabasta: { bpm: 96, beat: 4, bars: 4, tracks: [
      { inst: 'oud', v: 1, seq: 'D5:2 Eb5:2 F#5:4 G5:2 F#5:2 Eb5:4 | D5:4 C5:2 Bb4:2 A4:8 | A4:2 Bb4:2 C5:2 D5:2 Eb5:4 D5:4 | C5:2 Bb4:2 A4:4 D5:8' },
      { inst: 'pad', chords: [['D', 'maj'], ['G', 'min'], ['C', 'min'], ['D', 'maj']], pattern: [0], len: 16, oct: 3, v: .7 },
      { inst: 'bass', roots: ['D2', 'D2', 'D2', 'D2'], pattern: [0, 6, 10], len: 2, v: .8 },
      { drum: 'doum', hits: [0, 6, 10], v: .8 }, { drum: 'tek', hits: [3, 4, 8, 12, 14], v: .9 }] },
    skypiea: { bpm: 88, beat: 4, bars: 4, tracks: [
      { inst: 'bell', v: 1, seq: 'F5:4 A5:4 B5:4 C6:4 | E6:8 D6:4 C6:4 | A5:4 C6:4 G5:8 | F5:16' },
      { inst: 'pad', chords: [['F', 'maj'], ['G', 'maj'], ['A', 'min'], ['F', 'maj']], pattern: [0], len: 16, oct: 3, v: .9 },
      { inst: 'pluck', arp4: [['F', 'maj'], ['G', 'maj'], ['A', 'min'], ['F', 'maj']], oct: 4, v: .45 }] },
    dark: { bpm: 70, beat: 4, bars: 4, tracks: [
      { inst: 'bell', v: .9, seq: 'C5:8 Eb5:8 | D5:8 G4:8 | Ab4:8 G4:4 F4:4 | G4:16' },
      { inst: 'pad', chords: [['C', 'min'], ['Ab', 'maj'], ['F', 'min'], ['G', 'maj']], pattern: [0], len: 16, oct: 2, v: 1.1 },
      { inst: 'bass', roots: ['C2', 'Ab1', 'F1', 'G1'], pattern: [0], len: 16, v: .6 },
      { drum: 'kick', hits: [0, 3], v: .5 }] },
    giant: { bpm: 84, beat: 4, bars: 4, tracks: [
      { inst: 'horn', v: 1, seq: 'D4:4 F4:4 A4:8 | G4:4 F4:4 E4:4 C4:4 | D4:4 A4:4 C5:4 B4:4 | A4:16' },
      { inst: 'pad', chords: [['D', 'min'], ['C', 'maj'], ['D', 'min'], ['A', 'maj']], pattern: [0], len: 16, oct: 3, v: .6 },
      { inst: 'bass', roots: ['D2', 'C2', 'D2', 'A1'], pattern: [0, 8], len: 6 },
      { drum: 'tom', hits: [0, 3, 8, 11, 14], v: 1 }, { drum: 'kick', hits: [0, 8], v: .6 }] },
    battle: { bpm: 150, beat: 4, bars: 4, tracks: [
      { inst: 'lead', v: 1, seq: 'E5:2 G5:2 A5:2 B5:4 A5:2 G5:2 F#5:2 | G5:2 E5:2 C5:4 D5:4 E5:4 | F#5:2 A5:2 D6:4 C6:2 B5:2 A5:4 | B5:6 A5:2 G5:2 F#5:2 D#5:4' },
      { inst: 'bass', roots: ['E2', 'C2', 'D2', 'B1'], pattern: [0, 2, 4, 6, 8, 10, 12, 14], len: 1, oct8: [0, 0, 12, 0, 0, 12, 0, 7] },
      { inst: 'accordion', chords: [['E', 'min'], ['C', 'maj'], ['D', 'maj'], ['B', 'dom7']], pattern: [2, 6, 10, 14], len: 1, oct: 4, v: .8 },
      { drum: 'kick', hits: [0, 6, 8, 10], v: .9 }, { drum: 'snare', hits: [4, 12], v: .8 }, { drum: 'hat', hits: [0, 2, 4, 6, 8, 10, 12, 14], v: 1 }] },
    boss: { bpm: 164, beat: 4, bars: 4, tracks: [
      { inst: 'lead', v: 1.1, seq: 'A5:4 C6:2 B5:2 A5:2 G#5:2 E5:4 | F5:4 A5:2 G5:2 F5:2 E5:2 D5:4 | D5:2 F5:2 A5:4 C6:2 B5:2 A5:4 | G#5:4 B5:4 E6:8' },
      { inst: 'bass', roots: ['A1', 'F1', 'D2', 'E2'], pattern: [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14], len: 1 },
      { inst: 'pad', chords: [['A', 'min'], ['F', 'maj'], ['D', 'min'], ['E', 'maj']], pattern: [0], len: 16, oct: 3, v: .9 },
      { drum: 'kick', hits: [0, 2, 6, 8, 10, 14], v: 1 }, { drum: 'snare', hits: [4, 12], v: 1 }, { drum: 'hat', hits: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], v: .7 }] },
    gacha: { bpm: 120, beat: 4, bars: 2, tracks: [
      { inst: 'bell', v: .8, seq: 'C6:2 E6:2 G6:2 E6:2 A6:2 G6:2 E6:4 | F6:2 D6:2 B5:2 D6:2 C6:8' },
      { inst: 'pluck', arp4: [['C', 'maj'], ['G', 'maj']], oct: 4, v: .5 },
      { inst: 'bass', roots: ['C2', 'G1'], pattern: [0, 8], len: 4, v: .6 }] }
  };
  const ONESHOT = {
    victory: { bpm: 140, beat: 4, bars: 2, once: true, tracks: [{ inst: 'lead', v: 1.2, seq: 'C5:1 E5:1 G5:1 C6:3 G5:2 C6:8 | -:16' }, { inst: 'accordion', v: 1, seq: 'C4+E4+G4:4 -:2 C4+F4+A4:2 C4+E4+G4:8 | -:16' }, { drum: 'snare', hits: [0, 1, 2, 3, 6, 8], v: .7 }] },
    defeat: { bpm: 80, beat: 4, bars: 2, once: true, tracks: [{ inst: 'pad', v: 1.4, seq: 'A3+C4+E4:8 F3+A3+C4:8 | E3+G#3+B3:16' }, { inst: 'bell', v: .8, seq: 'E5:4 C5:4 A4:4 G#4:4 | A4:16' }] },
    clear: { bpm: 120, beat: 4, bars: 3, once: true, tracks: [{ inst: 'horn', v: 1.2, seq: 'G4:2 C5:2 E5:2 G5:4 E5:2 G5:4 | A5:4 G5:4 E5:4 C5:4 | D5:4 E5:4 C5:8' }, { drum: 'tom', hits: [0, 4, 8, 12, 14], v: 1 }] }
  };
  function compile(def) {
    const spb = def.beat === 3 ? 6 : 16; // 每小節步數
    const stepDur = def.beat === 3 ? 60 / def.bpm / 2 : 60 / def.bpm / 4;
    const total = spb * def.bars, events = [];
    def.tracks.forEach(tr => {
      const v = tr.v || 1;
      if (tr.seq) parse(tr.seq).notes.forEach(n => n.m.forEach(m => events.push({ s: n.s, inst: tr.inst, m, len: n.len, v })));
      if (tr.chords) tr.chords.forEach((c, b) => tr.pattern.forEach(p => chord(c[0], c[1], tr.oct).forEach(m => events.push({ s: b * spb + p, inst: tr.inst, m, len: tr.len, v: v * .8 }))));
      if (tr.arp) tr.arp.forEach((c, b) => { const ns = chord(c[0], c[1], tr.oct); [0, 1, 2, 1, 2, 0].forEach((k, i) => events.push({ s: b * spb + i, inst: tr.inst, m: ns[k] + (i === 3 ? 12 : 0), len: 1, v })); });
      if (tr.arp4) tr.arp4.forEach((c, b) => { const ns = chord(c[0], c[1], tr.oct); for (let i = 0; i < 16; i += 2) events.push({ s: b * spb + i, inst: tr.inst, m: ns[(i / 2) % ns.length] + (i >= 8 ? 12 : 0), len: 2, v }); });
      if (tr.roots) tr.roots.forEach((r, b) => tr.pattern.forEach((p, i) => events.push({ s: b * spb + p, inst: tr.inst, m: n2m(r) + (tr.oct8 ? tr.oct8[i % tr.oct8.length] : 0), len: tr.len, v })));
      if (tr.drum) for (let b = 0; b < def.bars; b++) tr.hits.forEach(h => events.push({ s: b * spb + h, drum: tr.drum, v }));
    });
    events.sort((a, b) => a.s - b.s);
    return { events, total, stepDur, once: def.once };
  }
  const cache = {};
  function getSong(name) { if (!cache[name]) cache[name] = compile(SONGS[name] || ONESHOT[name]); return cache[name]; }
  function tick() {
    if (!song) return;
    while (nextTime < ctx.currentTime + .15) {
      const s = step % song.total;
      for (const e of song.byStep[s] || []) { if (e.drum) DRUM[e.drum](nextTime, e.v, musicBus); else INST[e.inst](nextTime, mtof(e.m), e.len * song.stepDur * .92, e.v, musicBus); }
      nextTime += song.stepDur; step++;
      if (song.once && step >= song.total) { const after = song.after; song = null; clearInterval(timer); if (after) setTimeout(() => playSong(after), 600); return; }
    }
  }
  function playSong(name, after) {
    if (!ctx || ctx.state !== 'running') { pending = { name }; songName = name; return; }
    if (songName === name && song && !song.once) return;
    clearInterval(timer); songName = name;
    const base = getSong(name); song = { ...base, after, byStep: {} };
    base.events.forEach(e => (song.byStep[e.s] = song.byStep[e.s] || []).push(e));
    // 淡入
    musicBus.gain.cancelScheduledValues(ctx.currentTime); musicBus.gain.setValueAtTime(.0001, ctx.currentTime); musicBus.gain.linearRampToValueAtTime(pref.muted ? 0 : pref.music * .5, ctx.currentTime + .6);
    step = 0; nextTime = ctx.currentTime + .08; timer = setInterval(tick, 25); tick();
  }
  function stopSong() { clearInterval(timer); song = null; songName = null; }

  /* ---------- 環境音 ---------- */
  let ambPending = null;
  function ambient(kind) {
    if (!ctx || ctx.state !== 'running') { ambPending = kind; return; }
    if (ambName === kind) return; ambName = kind;
    ambNodes.forEach(n => { try { n.stop(); } catch (e) { } }); ambNodes = [];
    if (!kind) return;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = kind === 'wind' ? 'bandpass' : 'lowpass'; f.frequency.value = kind === 'wind' ? 900 : 520; f.Q.value = kind === 'wind' ? .6 : .3;
    const g = ctx.createGain(); g.gain.value = kind === 'wind' ? .12 : .18;
    const lfo = ctx.createOscillator(); lfo.frequency.value = kind === 'wind' ? .13 : .09; const lg = ctx.createGain(); lg.gain.value = kind === 'wind' ? .08 : .14; lfo.connect(lg); lg.connect(g.gain);
    if (kind === 'wind') { const l2 = ctx.createOscillator(); l2.frequency.value = .07; const l2g = ctx.createGain(); l2g.gain.value = 500; l2.connect(l2g); l2g.connect(f.frequency); l2.start(); ambNodes.push(l2); }
    src.connect(f); f.connect(g); g.connect(ambBus); src.start(); lfo.start(); ambNodes.push(src, lfo);
  }

  /* ---------- 音效 ---------- */
  function sweep(type, f0, f1, dur, vol, t) { t = t || ctx.currentTime; const g = ctx.createGain(); g.connect(sfxBus); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); o.connect(g); o.start(t); o.stop(t + dur + .02); }
  function burst(fType, freq, dur, vol, t, q, freqEnd) { t = t || ctx.currentTime; const g = ctx.createGain(); g.connect(sfxBus); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); const f = ctx.createBiquadFilter(); f.type = fType; f.frequency.setValueAtTime(freq, t); if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur); f.Q.value = q || 1; f.connect(g); noise(t, dur + .05, f); }
  function tone(f, dur, vol, t, type) { t = t || ctx.currentTime; const g = ctx.createGain(); g.connect(sfxBus); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + dur); const o = ctx.createOscillator(); o.type = type || 'sine'; o.frequency.value = f; o.connect(g); o.start(t); o.stop(t + dur + .02); }
  const FX = {
    click() { tone(880, .06, .12, 0, 'triangle'); },
    blip() { tone(660 + Math.random() * 120, .04, .05, 0, 'square'); },
    coin() { const t = ctx.currentTime; tone(1318, .09, .2, t, 'square'); tone(1976, .25, .18, t + .07, 'square'); },
    pickup() { const t = ctx.currentTime;[784, 988, 1175, 1568].forEach((f, i) => tone(f, .12, .14, t + i * .05, 'triangle')); },
    quest() { const t = ctx.currentTime;[523, 659, 784, 1047].forEach((f, i) => tone(f, .3, .15, t + i * .08, 'triangle')); },
    whoosh() { burst('bandpass', 600, .25, .35, 0, 1, 2400); },
    punch() { sweep('sine', 160, 40, .18, .8); burst('lowpass', 1200, .08, .5); },
    hit() { sweep('sine', 120, 35, .22, .9); burst('lowpass', 2500, .1, .6); },
    heavy() { sweep('sine', 90, 25, .5, 1); burst('lowpass', 800, .4, .8, 0, .5, 100); },
    slash() { burst('highpass', 3000, .18, .4, 0, 1); sweep('sawtooth', 1800, 400, .15, .08); },
    zap() { const t = ctx.currentTime; for (let i = 0; i < 6; i++) burst('bandpass', 2000 + Math.random() * 4000, .04, .35, t + i * .03, 4); sweep('square', 1200, 80, .3, .12, t); },
    thunder() { burst('lowpass', 1800, 1.4, 1, 0, .5, 60); sweep('sawtooth', 80, 30, 1, .25); },
    explode() { burst('lowpass', 1500, 1, 1, 0, .6, 50); sweep('sine', 80, 20, .8, .9); },
    sand() { burst('bandpass', 3500, .7, .35, 0, .8, 1200); },
    water() { burst('lowpass', 900, .8, .5, 0, 1, 200); const t = ctx.currentTime; for (let i = 0; i < 5; i++) sweep('sine', 400 + Math.random() * 400, 900, .08, .08, t + i * .07); },
    dark() { sweep('sawtooth', 60, 220, .7, .18); burst('lowpass', 400, .9, .6, 0, 2, 120); },
    ice() { const t = ctx.currentTime; for (let i = 0; i < 5; i++) tone(2000 + Math.random() * 2000, .25, .07, t + i * .04, 'sine'); burst('highpass', 5000, .3, .25, t); },
    heal() { const t = ctx.currentTime;[523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .5, .09, t + i * .06, 'sine')); },
    buff() { const t = ctx.currentTime; sweep('triangle', 300, 1200, .35, .15, t); tone(1568, .3, .08, t + .3); },
    drum() { const t = ctx.currentTime; sweep('sine', 110, 50, .3, .9, t); sweep('sine', 110, 50, .3, .7, t + .38); },
    petals() { const t = ctx.currentTime; for (let i = 0; i < 8; i++) tone(1200 + Math.random() * 900, .12, .05, t + i * .04, 'sine'); },
    miss() { burst('bandpass', 1500, .2, .2, 0, 2, 3000); },
    crank() { const t = ctx.currentTime; for (let i = 0; i < 10; i++) burst('bandpass', 2600, .025, .45, t + i * .09, 8); },
    pop() { sweep('sine', 300, 1400, .09, .5); burst('highpass', 3000, .06, .3); },
    rare() { const t = ctx.currentTime;[784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, .6, .12, t + i * .07, 'triangle')); burst('highpass', 6000, .8, .12, t + .2); },
    ult() { const t = ctx.currentTime; sweep('sawtooth', 200, 1600, .6, .12, t); burst('highpass', 2000, .6, .3, t, 1, 8000); }
  };
  return {
    playSong, stopSong, ambient, unlock,
    sfx(name) { if (!ctx || ctx.state !== 'running' || pref.muted || !FX[name]) return; try { FX[name](); } catch (e) { } },
    jingle(name, after) { if (!ctx || ctx.state !== 'running') return; clearInterval(timer); songName = name; const base = getSong(name); song = { ...base, after, byStep: {} }; base.events.forEach(e => (song.byStep[e.s] = song.byStep[e.s] || []).push(e)); musicBus.gain.cancelScheduledValues(ctx.currentTime); musicBus.gain.setValueAtTime(pref.muted ? 0 : pref.music * .5, ctx.currentTime); step = 0; nextTime = ctx.currentTime + .05; timer = setInterval(tick, 25); tick(); },
    get pref() { return pref; },
    setPref(p) { Object.assign(pref, p); try { localStorage.setItem(PREF_KEY, JSON.stringify(pref)); } catch (e) { } if (ctx) { master.gain.value = pref.muted ? 0 : 1; musicBus.gain.value = pref.music * .5; ambBus.gain.value = pref.music * .5; sfxBus.gain.value = pref.sfx; } }
  };
})();
const SFX = { play: (n) => AUDIO.sfx(n) };
