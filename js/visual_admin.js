/* 後台「立繪調整」：選角色、皮膚或變身型態，用滑桿調整對戰大小、勾選鏡像，即時預覽後儲存。
   設定存在 op_visual_v1，不會因為改版（DATA_VERSION）而失效；戰鬥時由 visualOverride() 讀取。 */
(function () {
  const KEY = 'op_visual_v1', load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } };
  const FORMS = { loki: ['尼德霍格巨龍', 'formImage'], marco: ['不死鳥型態', 'phoenixForm'] };
  function entries() {
    const L = [];
    CHARACTER_ORDER.forEach(id => { const c = CHARACTERS[id]; L.push({ key: 'char:' + id, label: `角色・${c.name}`, img: c.image, scale: c.battleScale || 1, face: !!c.faceLeft, base: c.scale || .9 }); });
    Object.entries(SKINS).filter(([k, s]) => !s.soon).forEach(([k, s]) => { const c = CHARACTERS[s.char]; L.push({ key: 'skin:' + k, label: `皮膚・${c.name}「${s.name}」`, img: s.image, scale: s.battleScale || c.battleScale || 1, face: s.faceLeft !== undefined ? s.faceLeft : !!c.faceLeft, base: c.scale || .9 }); });
    Object.entries(FORMS).forEach(([id, [n, k]]) => { const c = CHARACTERS[id], ef = c.skills[4].effect[k] || {}; if (ef.image) L.push({ key: 'form:' + id, label: `變身・${c.name}（${n}）`, img: ef.image, scale: ef.scale || 1, face: !!ef.mirror, base: (c.scale || .9) * (c.battleScale || 1), form: true }); });
    return L;
  }
  let cur = 'char:luffy';
  window.renderVisualAdmin = function (P) {
    const L = entries(), V = load(); if (!L.find(e => e.key === cur)) cur = L[0].key;
    const e = L.find(x => x.key === cur), o = V[cur] || {}, sc = o.battleScale || e.scale, fc = o.faceLeft !== undefined ? o.faceLeft : e.face;
    P.innerHTML = `<h3>立繪調整</h3><p class="an">選擇角色、皮膚或變身型態，調整對戰時的大小與面向（頭與眼神要朝向右邊的對手）。預覽中右邊是參考用的對手。儲存後下一場戰鬥立即生效，改版也不會被重置。</p>
      <div class="vz-ctl"><select id="vzSel">${L.map(x => `<option value="${x.key}" ${x.key === cur ? 'selected' : ''}>${x.label}${V[x.key] ? '（已調整）' : ''}</option>`).join('')}</select>
        <label>對戰大小 <input type="range" id="vzScale" min="0.3" max="3" step="0.05" value="${sc}"><b id="vzVal">${(+sc).toFixed(2)}</b> 倍</label>
        <label class="vz-chk"><input type="checkbox" id="vzFace" ${fc ? 'checked' : ''}> 鏡像（原圖的頭朝左時勾選）</label></div>
      <div class="vz-stage" id="vzStage"><div class="vz-f L"><img id="vzImg" src="${e.img}" alt=""></div><div class="vz-f R"><img src="${CHARACTERS.crocodile.image}" alt=""></div><i class="vz-ground"></i></div>
      <div class="vz-btns"><button class="btn-ghost" id="vzReset">恢復預設</button><button class="btn-gold" id="vzSave">儲存此項</button></div>`;
    const img = $('vzImg'), apply = () => { const s = +$('vzScale').value; $('vzVal').textContent = s.toFixed(2); img.style.transform = `scale(${(e.base * s).toFixed(3)}) scaleX(${$('vzFace').checked ? -1 : 1})`; };
    $('vzScale').oninput = apply; $('vzFace').onchange = apply; apply();
    $('vzSel').onchange = ev => { cur = ev.target.value; renderVisualAdmin(P); };
    $('vzSave').onclick = () => { const W = load(); W[cur] = { battleScale: +$('vzScale').value, faceLeft: $('vzFace').checked }; localStorage.setItem(KEY, JSON.stringify(W)); toast('立繪設定已儲存', 'gold'); renderVisualAdmin(P); };
    $('vzReset').onclick = () => { const W = load(); delete W[cur]; localStorage.setItem(KEY, JSON.stringify(W)); toast('已恢復預設'); renderVisualAdmin(P); };
  };
})();
