import os
HERE=os.path.dirname(os.path.abspath(__file__)); os.makedirs(os.path.join(HERE,"shots"),exist_ok=True)
import sys, json, threading, http.server, socketserver, os, functools
from playwright.sync_api import sync_playwright
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..')); PORT=8811
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
H=functools.partial(Q,directory=ROOT)
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.ThreadingTCPServer(('127.0.0.1',PORT),H); threading.Thread(target=srv.serve_forever,daemon=True).start()
# args: name js [w h] [wait]
jobs=json.loads(open(sys.argv[1][1:]).read() if sys.argv[1].startswith("@") else sys.argv[1])
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    for j in jobs:
        w,h=j.get('vp',[390,844])
        ctx=b.new_context(viewport={'width':w,'height':h},is_mobile=j.get('mobile',True),has_touch=j.get('mobile',True),device_scale_factor=2 if j.get('mobile',True) else 1)
        pg=ctx.new_page(); errs=[]
        pg.on('pageerror',lambda e: errs.append(str(e)+' @ '+(e.stack or '').split('\n')[1][:120] if e.stack and '\n' in e.stack else str(e)))
        pg.on('response',lambda r: errs.append('404 '+r.url) if r.status==404 else None)
        pg.on('console',lambda m: errs.append('console:'+m.text) if m.type=='error' else None)
        if j.get('init'): pg.add_init_script(j['init'])
        pg.goto(f'http://127.0.0.1:{PORT}/index.html'); pg.wait_for_timeout(2500)
        pg.evaluate("()=>{const b=document.getElementById('ldEnter'); if(b) b.click();}"); pg.wait_for_timeout(700)
        pg.evaluate("()=>{const l=document.getElementById('loader'); if(l) l.remove();}")
        try:
            r=pg.evaluate("async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));"+j.get('js','')+"}")
            if r: print(j['name'],'->',r,flush=True)
        except Exception as e: print('EVAL ERR',j['name'],e)
        pg.wait_for_timeout(j.get('wait',1200))
        if j.get('full'): pg.screenshot(path=f""+os.path.join(HERE,'shots','')+f"{j['name']}.png",full_page=True)
        else: pg.screenshot(path=f""+os.path.join(HERE,'shots','')+f"{j['name']}.png")
        errs=[e for e in errs if '403' not in e]
        if errs: print(j['name'],'ERRORS:',errs[:8],flush=True)
        ctx.close()
    b.close()
srv.shutdown()
