import os
HERE=os.path.dirname(os.path.abspath(__file__)); os.makedirs(os.path.join(HERE,"shots"),exist_ok=True)
import json,subprocess,sys
S=open(os.path.join(HERE,'setup.js')).read().replace('\n',' ')
VPS={'desk':([1280,800],False),'laptop':([1366,680],False),'tabP':([768,1024],True),'tabL':([1024,768],True),'phone':([390,844],True),'small':([360,640],True),'tiny':([320,568],True),'land':([844,390],True)}
SCR={'lobby':'openModes()','chart':'openChart("dressrosa")','emperor':'openEmperor()','exch':'openExchange()','tower':'openTower()','runner':'openRunner()','crew':'openCrew("crew")','codex':'openCrew("codex")','gacha':"openGacha('modeScreen')",
 'battle':'startBattle({team:[{id:"whitebeard",lv:90},{id:"shanks",lv:90},{id:"hancock",lv:90}],enemyId:"aokiji",enemyLv:90,chapterId:"dark",isBoss:true,onEnd:()=>({}),onLeave:()=>{}})',
 'world':'enterChapter("thriller")','throne':'openThrone()','modes':'openModes(); document.getElementById("lbModesBtn").click()'}
CHECK='''const vw=innerWidth,vh=innerHeight,bad=[];const scr=document.querySelector('.screen:not(.hidden)');
document.querySelectorAll('button,a,input,.coin,h2,h3').forEach(e=>{const r=e.getBoundingClientRect();if(!r.width||!r.height)return;const st=getComputedStyle(e);if(st.visibility==='hidden'||st.opacity==='0')return;
 let p=e,hid=false;while(p){const s=getComputedStyle(p);if(s.display==='none'){hid=true;break}p=p.parentElement}if(hid)return;
 if(r.right>vw+2||r.left<-2){ // ignore inside horizontal scrollers
   let q=e.parentElement,sc=false;while(q){const s=getComputedStyle(q);if(/auto|scroll/.test(s.overflowX)&&q.scrollWidth>q.clientWidth){sc=true;break}q=q.parentElement} if(!sc)bad.push('OUT:'+(e.id||e.className||e.tagName).toString().slice(0,30)+'@'+Math.round(r.left)+'-'+Math.round(r.right));}
 if(e.tagName==='BUTTON'&&e.scrollWidth>e.clientWidth+3&&st.overflow!=='visible'&&st.whiteSpace==='nowrap')bad.push('CLIP:'+(e.id||e.textContent.trim().slice(0,10)));});
if(document.documentElement.scrollWidth>vw+2)bad.push('DOC-HSCROLL '+document.documentElement.scrollWidth);
return [...new Set(bad)].slice(0,12).join(' ');'''
jobs=[]
for vk,(vp,mob) in [(k,VPS[k]) for k in sys.argv[2].split(',')] if len(sys.argv)>2 else VPS.items():
  for sk,js in SCR.items():
    if len(sys.argv)>1 and sys.argv[1]!='all' and sk not in sys.argv[1].split(','): continue
    jobs.append({'name':f'{vk}_{sk}','vp':vp,'mobile':mob,'js':S+js+'; await w(1300); await __close();'+CHECK,'wait':200})
open('/tmp/jobs.json','w').write(json.dumps(jobs)); subprocess.run(['python3',os.path.join(HERE,'shot.py'),'@/tmp/jobs.json'],stderr=subprocess.DEVNULL)
