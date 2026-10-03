const out=[];const step=async(name,fn)=>{try{await fn();await w(300);document.querySelectorAll('.modal.show').forEach(m=>{try{closeModal(m.id)}catch(e){}});document.querySelectorAll('.dl-wrap,.tr-puzzle').forEach(x=>x.remove());}catch(e){out.push(name+': '+e.message+' '+(e.stack||'').split('\n')[1])}};
GAME_SETTINGS.unlockAll=true;['luffy','zoro','sanji','whitebeard','shanks'].forEach(id=>addCrew(id,90));SAVE.data.lineup=['whitebeard','shanks','luffy'];SAVE.save();
await step('lobby',()=>openModes());
await step('gacha',()=>openGacha('modeScreen'));
await step('crew',()=>openCrew('crew'));await step('codex',()=>openCrew('codex'));
await step('chart',()=>openChart());
await step('chart egghead',()=>{SAVE.data.chapters.egghead.cleared=true;openChart('egghead')});
await step('tower',()=>openTower());
await step('emperor',()=>openEmperor());
await step('exchange',()=>openExchange());
await step('runner',()=>openRunner());
for(const id of ['thriller','dressrosa','egghead','dark']) await step('enter '+id,async()=>{enterChapter(id);await w(1500)});
await step('all skills',async()=>{startBattle({team:[{id:'luffy',lv:80}],enemyId:'crocodile',enemyLv:60,chapterId:'east',isBoss:true,revives:0,onEnd:()=>({message:''}),onLeave:()=>{}});await w(1200);
 for(const id of CHARACTER_ORDER){const f=buildFighter(id,90);for(const s of f.skills){try{const sk=JSON.parse(JSON.stringify(s));const E=battle.enemy;E.hp=E.maxHp;const r=computeSkillOutcome(f,E,sk,{});if(r.damage>0)applyDamage(E,r.damage,'R',r.meta);applySkillEffects(f,E,sk,r);for(let k=0;k<3;k++){endTurnStatus(f);endTurnStatus(E)}}catch(e){out.push(id+' '+s.name+': '+e.message)}}}
 battle.gameOver=true;});
return out.join(' || ')||'ALL OK';
