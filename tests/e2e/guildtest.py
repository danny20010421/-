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
    for pg in (A,B): pg.evaluate("()=>{document.querySelectorAll('.cl-ask').forEach(x=>x.remove());}")
    A.evaluate("async()=>{openGuild(); await new Promise(r=>setTimeout(r,1500)); document.getElementById('gdName').value='草帽大船團'; document.getElementById('gdNotice').value='一起打BOSS'; document.querySelector('[data-a=create]').click(); await new Promise(r=>setTimeout(r,1500));}")
    print('A guild:', A.evaluate("()=>document.querySelector('.gd-card .sc-body').innerText.slice(0,160).replace(/\\n/g,' | ')"))
    B.wait_for_timeout(500)
    B.evaluate("async()=>{openGuild(); await new Promise(r=>setTimeout(r,2000));}")
    print('B list:', B.evaluate("()=>document.querySelector('.gd-card .sc-body').innerText.slice(-120).replace(/\\n/g,' | ')"))
    B.evaluate("async()=>{document.querySelector('[data-join]').click(); await new Promise(r=>setTimeout(r,1500)); document.querySelector('[data-sub=chat]').click(); await new Promise(r=>setTimeout(r,200)); document.getElementById('gdMsg').value='大家好！'; document.querySelector('[data-a=post]').click(); await new Promise(r=>setTimeout(r,1000));}")
    A.wait_for_timeout(1200)
    A.evaluate("()=>document.querySelector('[data-sub=chat]').click()")
    print('A chat:', A.evaluate("()=>document.querySelector('#gdChat').innerText.replace(/\\n/g,' | ')"))
    A.evaluate("async()=>{document.querySelector('[data-sub=boss]').click(); await new Promise(r=>setTimeout(r,200)); document.querySelector('[data-a=fight]').click(); await new Promise(r=>setTimeout(r,2500)); battle.enemy.hp=battle.enemy.maxHp-12345; const r=battle.onEnd({win:false,fled:false,team:[]}); window.__r=r.message; await new Promise(r=>setTimeout(r,1500)); r.next.fn(); await new Promise(r=>setTimeout(r,1500));}")
    print('A after fight:', A.evaluate("()=>window.__r.replace(/<[^>]+>/g,'')"))
    B.wait_for_timeout(1500)
    B.evaluate("()=>document.querySelector('[data-sub=boss]').click()")
    print('B boss:', B.evaluate("()=>document.querySelector('.gd-card .sc-body').innerText.slice(0,400).replace(/\\n/g,' | ')"))
    A.screenshot(path=os.path.join(HERE,'shots','guildA.png'); B.screenshot(path=os.path.join(HERE,'shots','guildB.png')
    b.close()
print('ERRORS', errs[:10])
srv.shutdown()
