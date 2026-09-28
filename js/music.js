/* 背景音樂檔：把有權使用的音樂檔放進 assets/music/，就會取代該畫面的合成音樂；沒有檔案時沿用原本的合成音樂 */
const MUSIC_TRACKS = { title: 'assets/music/title.mp3', tower: 'assets/music/tower.mp3', stage: 'assets/music/stage.mp3', battle: 'assets/music/battle.mp3?v=33' };
const MUSIC_BY_SCREEN = { loginScreen: 'title', towerScreen: 'tower', chapterScreen: 'stage', worldScreen: 'stage', battleScreen: 'battle' };
(function () {
  const exists = {}, audio = new Audio(); audio.loop = true; audio.preload = 'auto'; let cur = null;
  function check(key) { if (key in exists) return exists[key]; exists[key] = fetch(MUSIC_TRACKS[key], { method: 'HEAD', cache: 'no-store' }).then(r => r.ok && !(r.headers.get('content-type') || '').includes('text/html')).catch(() => false); return exists[key]; }
  function vol() { const p = (window.AUDIO && AUDIO.pref) || {}; return p.muted ? 0 : (p.music ?? .55); }
  async function onScreen(id) {
    const key = MUSIC_BY_SCREEN[id];
    if (!key) { if (cur) { audio.pause(); cur = null; } return; }
    if (!(await check(key))) { if (cur) { audio.pause(); cur = null; } return; }
    if (window.AUDIO && AUDIO.stopSong) AUDIO.stopSong();
    if (cur !== key) { cur = key; audio.src = MUSIC_TRACKS[key]; audio.currentTime = 0; }
    audio.volume = vol(); if (audio.paused) audio.play().catch(() => { });
  }
  window.MUSIC = { onScreen, refresh: () => { audio.volume = vol(); }, state: () => ({ track: cur, src: audio.src.split('/').pop(), paused: audio.paused, time: +audio.currentTime.toFixed(1), duration: Math.round(audio.duration || 0), volume: audio.volume }) };
  window.addEventListener('DOMContentLoaded', () => {
    const ss = window.showScreen; if (ss) window.showScreen = function (id) { const r = ss.apply(this, arguments); onScreen(id); return r; };
    setInterval(() => { if (cur) audio.volume = vol(); }, 800);
    document.addEventListener('visibilitychange', () => { if (document.hidden) audio.pause(); else if (cur) audio.play().catch(() => { }); });
  });
})();
