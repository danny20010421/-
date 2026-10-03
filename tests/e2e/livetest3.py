import os
HERE=os.path.dirname(os.path.abspath(__file__)); os.makedirs(os.path.join(HERE,"shots"),exist_ok=True)
import threading, http.server, socketserver, functools, json, time
from playwright.sync_api import sync_playwright
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..')); PORT=8822
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.ThreadingTCPServer(('127.0.0.1',PORT),functools.partial(Q,directory=ROOT)); threading.Thread(target=srv.serve_forever,daemon=True).start()
fake=open(os.path.join(HERE,'fakefb3.js')).read()
SETUP="""GAME_SETTINGS.unlockAll=true;['luffy','zoro','whitebeard','shanks','hancock'].forEach(id=>addCrew(id,90));SAVE.data.lineup=['shanks','luffy'];SAVE.data.login={day:1,last:today()};SAVE.data.lastExport=Date.now();SAVE.data.guide={lobby:1};SAVE.save();
localStorage.setItem('op_cloud_on','1');"""
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    pages={}
    for who,uid,name in [('A','u1','Alpha'),('B','u2','Bravo')]:
        pg=ctx.new_page(); pg.on('pageerror',lambda e,w=who: errs.append(w+':'+str(e)))
        pg.add_init_script(f"sessionStorage.setItem('FAKEUSER',JSON.stringify({{uid:'{uid}',email:'{uid}@x.com'}}));"+fake)
        pg.goto(f'http://127.0.0.1:{PORT}/index.html'); pg.wait_for_timeout(2500)
        pg.evaluate("()=>{const b=document.getElementById('ldEnter'); if(b) b.click(); const l=document.getElementById('loader'); if(l) l.remove();}")
        pg.evaluate("async()=>{"+SETUP+"}")
        # 名稱與名片
        pg.evaluate(f"async()=>{{const d=window.__db(); d.usernames=d.usernames||{{}}; d.usernames['{name.lower()}']={{uid:'{uid}',name:'{name}'}}; localStorage.setItem('FAKEDB3',JSON.stringify(d)); playerProfile().account='{name}'; SAVE.save(); await CLOUD.sdk(); }}")
        pages[who]=pg
    time.sleep(3)
    A,B=pages['A'],pages['B']
    for pg in (A,B): pg.evaluate("()=>{document.querySelectorAll('.cl-ask').forEach(x=>{const c=x.querySelector('[data-c=local]'); x.remove();});}")
    # 好友關係
    A.evaluate("()=>{const d=window.__db(); d.friendships={f:{members:['u1','u2'],requester:'u1',status:'accepted'}}; localStorage.setItem('FAKEDB3',JSON.stringify(d));}")
    A.wait_for_timeout(800)
    B.evaluate("async()=>{openSocial('me'); await new Promise(r=>setTimeout(r,2000)); document.querySelector('[data-a=sync]').click(); await new Promise(r=>setTimeout(r,800)); document.querySelector('.sc-wrap').remove();}")
    A.wait_for_timeout(800)
    A.evaluate("async()=>{openSocial('friends'); await new Promise(r=>setTimeout(r,2500));}")
    print('A friends:', A.evaluate("()=>document.querySelector('.sc-body').innerText.slice(0,80)"))
    # 送禮
    A.evaluate("async()=>{document.querySelector('[data-gift]').click(); await new Promise(r=>setTimeout(r,800));}")
    # 邀請即時對戰
    A.evaluate("async()=>{document.querySelector('[data-live][data-m=\"3\"]').click(); await new Promise(r=>setTimeout(r,1500));}")
    print('A after invite:', A.evaluate("()=>document.querySelector('.lv-body').innerText.slice(0,60)"))
    B.wait_for_timeout(1500)
    print('B popup:', B.evaluate("()=>{const p=document.querySelector('.lv-pop'); return p?p.innerText:'none'}"))
    B.evaluate("()=>{document.querySelector('.lv-pop .btn-gold').click()}"); B.wait_for_timeout(1500)
    for pg,chs in ((A,['shanks','luffy','zoro']),(B,['whitebeard','hancock','luffy'])):
        for ch in chs: pg.evaluate(f"()=>document.querySelector('[data-pick={ch}]').click()")
        pg.evaluate("()=>document.querySelector('[data-a=pick]').click()")
    A.wait_for_timeout(2500)
    print('A battle:', A.evaluate("()=>document.querySelector('.lv-body').innerText.slice(0,120).replace(/\\n/g,' | ')"))
    print('B battle:', B.evaluate("()=>document.querySelector('.lv-body').innerText.slice(0,120).replace(/\\n/g,' | ')"))
    A.screenshot(path=os.path.join(HERE,'shots','liveA.png'); B.screenshot(path=os.path.join(HERE,'shots','liveB.png')
    B.evaluate("()=>document.querySelector('[data-emo=\"1\"]').click()"); A.wait_for_timeout(1200)
    print('A bubble:', A.evaluate("()=>{const b=document.querySelector('.lv-f.op .lv-bubble'); return b?b.textContent:'none'}"))
    # 觀戰者 C
    C=ctx.new_page(); C.on('pageerror',lambda e: errs.append('C:'+str(e)))
    C.add_init_script("sessionStorage.setItem('FAKEUSER',JSON.stringify({uid:'u3',email:'u3@x.com'}));"+fake)
    C.goto(f'http://127.0.0.1:{PORT}/index.html'); C.wait_for_timeout(2500)
    C.evaluate("()=>{const b=document.getElementById('ldEnter'); if(b) b.click(); const l=document.getElementById('loader'); if(l) l.remove();}")
    C.evaluate("async()=>{await CLOUD.sdk(); await new Promise(r=>setTimeout(r,800)); const rooms=await LIVE.liveOf(['u1']); LIVE.watch(rooms[0].id);}")
    C.wait_for_timeout(1500)
    print('C watch:', C.evaluate("()=>document.querySelector('.lv-body').innerText.slice(0,100).replace(/\\n/g,' | ')"))
    # A 換人一次
    A.evaluate("()=>{const b=document.querySelector('[data-sw]'); if(b) b.click();}"); B.evaluate("()=>{const b=[...document.querySelectorAll('.lv-skills button')].find(x=>!x.disabled); if(b) b.click();}"); A.wait_for_timeout(1500)
    print('after switch:', A.evaluate("()=>{const r=LIVE._room(); return r.state.h.a+' '+(r.ev||[]).slice(0,3).join(' / ')}"))
    # 打幾回合
    for t in range(40):
        st=A.evaluate("()=>LIVE._room().status")
        if st!='battle': break
        for pg in (A,B):
            pg.evaluate("()=>{const b=[...document.querySelectorAll('.lv-skills button')].find(x=>!x.disabled); if(b) b.click();}")
        A.wait_for_timeout(1200)
        r=A.evaluate("()=>{const r=LIVE._room(); return r.turn+' '+r.state.h.hp+'/'+r.state.g.hp+' '+(r.ev||[]).slice(-2).join(' / ')}")
        print('turn',r[:160])
    print('A end:', A.evaluate("()=>document.querySelector('.lv-body').innerText.slice(-80).replace(/\\n/g,' | ')"))
    print('B end:', B.evaluate("()=>document.querySelector('.lv-body').innerText.slice(-80).replace(/\\n/g,' | ')"))
    A.screenshot(path=os.path.join(HERE,'shots','liveA2.png'); B.screenshot(path=os.path.join(HERE,'shots','liveB2.png'); C.screenshot(path=os.path.join(HERE,'shots','liveC.png')
    print('C end:', C.evaluate("()=>document.querySelector('.lv-body').innerText.slice(-60).replace(/\\n/g,' | ')"))
    A.evaluate("()=>document.querySelector('[data-a=rematch]').click()"); A.wait_for_timeout(1500)
    print('rematch A:', A.evaluate("()=>document.querySelector('.lv-body').innerText.slice(0,30)"), ' B pop:', B.evaluate("()=>{const p=document.querySelector('.lv-pop'); return p?p.innerText.slice(0,20):'none'}"))
    A.evaluate("async()=>{document.querySelector('.lv-screen')&&document.querySelector('.lv-screen').remove(); openSocial('friends'); await new Promise(r=>setTimeout(r,1500)); document.querySelector('[data-note]').click(); await new Promise(r=>setTimeout(r,200)); document.querySelector('[data-q]').click(); document.querySelector('[data-a=notesend]').click(); await new Promise(r=>setTimeout(r,800));}")
    # B 的禮物
    B.evaluate("async()=>{document.querySelector('.lv-screen')&&document.querySelector('.lv-screen').remove(); openSocial('req'); await new Promise(r=>setTimeout(r,2000));}")
    print('B req:', B.evaluate("()=>document.querySelector('.sc-body').innerText.slice(0,150).replace(/\\n/g,' | ')"))
    print('duels:', A.evaluate("()=>JSON.stringify(Object.values(window.__db().duels||{}).map(d=>[d.mode,d.win,d.rounds]))"))
    b.close()
print('ERRORS', errs[:10])
srv.shutdown()
