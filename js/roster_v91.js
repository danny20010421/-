/* v91：依「登場篇章」重新排列角色序號；寇沙縮放、布魯克飛空斬擊、多利戰吼調整。 */
(function () {
  /* 序號規則（v93，依使用者指定）：
     No.001～011 主角群 → 海軍與世界政府（15）→ 王下七武海（13）→ 四皇團員（白鬍子 16、紅髮 11、百獸 12、BIG MOM 8、黑鬍子 10、十字公會 6）
     → 四皇（紅髮、黑鬍子、巴基、魯夫（尼卡）、白鬍子、BIG MOM、凱多）→ 其他角色依登場篇章（先排 100 位）→ 伊姆（No.???）→ 喬伊波伊（No.???）。
     '?群組' 是預留給還沒設計的角色的神秘編號。 */
  const R = (label, n) => Array(Math.max(0, n)).fill('?' + label);
  const block = (label, ids, total) => [...ids, ...R(label, total - ids.length)];
  const ORDER = [
    ...block('草帽一夥', [], 0), 'luffy0', 'zoro', '?草帽一夥', '?草帽一夥', 'sanji', '?草帽一夥', 'robin', 'franky', 'brook', 'jinbe', 'luffy', /* 第 11 號：巨人篇魯夫 */
    ...block('海軍與世界政府', ['coby0', 'morgan', 'marine', 'koby_mf', 'garp_mf', 'akainu', 'aokiji', 'kizaru', 'magellan', 'lucci', 'vergo', 'garp_hc', 'koby_hc'], 15),
    ...block('王下七武海', ['mihawk', 'crocodile', 'doflamingo', 'kuma', 'moria', 'law', 'hancock', 'kuma_eh'], 13),
    ...block('白鬍子海賊團', ['ace', 'marco'], 16), ...block('紅髮海賊團', [], 11), ...block('百獸海賊團', [], 12),
    ...block('BIG MOM 海賊團', ['katakuri'], 8), ...block('黑鬍子海賊團', ['catarina'], 10), ...block('十字公會', [], 6),
    'shanks', 'blackbeard', 'buggy', '?四皇', 'whitebeard', 'bigmom', 'kaido', /* 第 4 位是魯夫（尼卡型態），立繪完成前保留為神秘編號 */
    ...block('東海篇', ['makino', 'mayor', 'lordcoast'], 10), ...block('阿拉巴斯坦篇', ['vivi', 'koza'], 8), ...block('空島篇', ['enel', 'wiper'], 6),
    ...block('司法島篇', [], 7), ...block('恐怖三桅帆船篇', ['perona'], 6), ...block('魚人島篇', ['hody', 'shirahoshi'], 7),
    ...block('德雷斯羅薩篇', ['monet', 'sugar'], 12), ...block('蛋糕島篇', [], 8), ...block('和之國篇', ['kid', 'kinemon', 'tama', 'yamato'], 12),
    ...block('蜂巢島篇', [], 4), ...block('蛋頭島篇', ['vegapunk', 'york', 'morgans'], 8), ...block('巨人篇', ['loki', 'dorry', 'brogy'], 12),
    'imu', '!喬伊波伊'
  ];
  const finalList = ORDER.filter(x => x[0] === '?' || x[0] === '!' || CHARACTERS[x]); const extra = CHARACTER_ORDER.filter(id => !ORDER.includes(id) && CHARACTERS[id]);
  extra.forEach(id => finalList.splice(finalList.indexOf('imu'), 0, id)); /* 還沒排進規則的新角色：先放在伊姆之前 */
  CHARACTER_ORDER.length = 0; if (typeof RESERVED_NOS !== 'undefined') RESERVED_NOS.length = 0;
  finalList.forEach((x, i) => { if (x[0] === '?' || x[0] === '!') { if (typeof RESERVED_NOS !== 'undefined') RESERVED_NOS.push({ no: i + 1, group: x[0] === '!' ? '？？？' : x.slice(1), hideNo: x[0] === '!' }); } else { CHARACTER_ORDER.push(x); CHARACTERS[x].no = i + 1; delete CHARACTERS[x].noText; } });
  if (CHARACTERS.imu) { CHARACTERS.imu.mystery = true; CHARACTERS.imu.noText = '???'; } /* 伊姆：編號與身分都保持神秘 */
  window.CHAR_ARC = { luffy0: '東海篇', vivi: '阿拉巴斯坦篇', enel: '空島篇', franky: '司法島篇', moria: '恐怖三桅帆船篇', hancock: '頂上戰爭篇', hody: '魚人島篇', law: '德雷斯羅薩篇', katakuri: '蛋糕島篇', kid: '和之國篇', garp_hc: '蜂巢島篇', vegapunk: '蛋頭島篇', luffy: '巨人篇', imu: '其他' };

  /* ---------- 數值調整 ---------- */
  if (CHARACTERS.koza) CHARACTERS.koza.battleScale = .6;
  { const s = CHARACTERS.brook && CHARACTERS.brook.skills.find(x => x.name === '飛空斬擊'); if (s) Object.assign(s, { desc: '把斬擊送向遠方：20% 機率 10 倍、30% 機率 5 倍、50% 機率 2～3.5 倍傷害；自身下回合受到的傷害 -10%。', tags: [['倍率', 'red'], ['減傷', 'blue']], effect: { variableMultipliers: [[.2, 10], [.3, 5], [.5, [2, 3.5]]], damageReductionTurns: 2, damageReductionValue: .1 } }); }
  { const s = CHARACTERS.dorry && CHARACTERS.dorry.skills.find(x => x.name === '艾爾巴夫的戰吼'); if (s) Object.assign(s, { desc: '巨人戰士的怒吼響徹戰場：攻擊 +2，回復 50% 體力，40% 使對手恐懼 1 回合。', tags: [['強化', 'gold'], ['回復', 'green'], ['恐懼', 'gold']], effect: Object.assign({}, s.effect, { healRatio: .5 }) }); }
})();
