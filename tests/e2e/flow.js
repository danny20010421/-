const out=[];
const winAll=async(n)=>{for(let i=0;i<n;i++){await w(1300);const b=battle;const r=b.onEnd({win:true,fled:false,enemyId:b.enemy.id,isBoss:b.isBoss,rounds:3,team:b.team.map(f=>({id:f.id,hp:f.hp}))});out.push((r.message||'').replace(/<[^>]+>/g,'').slice(0,90));if(r.next&&!/返回/.test(r.next.label)){r.next.fn();}else break;}};
openEmperor();await w(500);document.querySelector('[data-id=kaido]').click();await w(200);$("epGo").click();await winAll(10);
out.push('phase '+SAVE.data.emperor.kaido.phase);
openEmperor();document.querySelector('[data-id=kaido]').click();$('epGo').click();await winAll(3);
openEmperor();document.querySelector('[data-id=kaido]').click();$('epGo').click();await winAll(2);
out.push('kaido owned '+owned('kaido')+' phase '+SAVE.data.emperor.kaido.phase);
SAVE.data.chapters.thriller.cleared=true;openChart('thriller');await w(300);$('hmGo').click();await winAll(6);out.push('stars '+hardStars('thriller'));
// tower 200
SAVE.data.tower={floor:200,best:199};openTower();await w(400);out.push($('twPanel').textContent.slice(0,120));
return out.join(' || ');
