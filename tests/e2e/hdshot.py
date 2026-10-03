import os
HERE=os.path.dirname(os.path.abspath(__file__)); os.makedirs(os.path.join(HERE,"shots"),exist_ok=True)
import threading, http.server, socketserver, functools, sys, json
from playwright.sync_api import sync_playwright
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..')); PORT=8833
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.ThreadingTCPServer(('127.0.0.1',PORT),functools.partial(Q,directory=ROOT)); threading.Thread(target=srv.serve_forever,daemon=True).start()
jobs=json.loads(sys.argv[1])
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    for j in jobs:
        w,h=j.get('vp',[1280,720]); pg=b.new_page(viewport={'width':w,'height':h},device_scale_factor=1); errs=[]
        pg.on('pageerror',lambda e: errs.append(str(e)[:600])); pg.on('console',lambda m: errs.append('c:'+m.text[:600]) if m.type in('error','warning') else None)
        pg.goto(f'http://127.0.0.1:{PORT}/sample_east.html'+j.get('q','')); pg.wait_for_timeout(j.get("load",1500))
        if j.get('js'): pg.evaluate("()=>{"+j['js']+"}")
        pg.wait_for_timeout(j.get('wait',6000))
        pg.screenshot(path=f""+os.path.join(HERE,'shots','')+f"{j['name']}.png")
        fps=pg.evaluate("()=>new Promise(r=>{let n=0,t0=performance.now();function f(){n++; if(performance.now()-t0<2000) requestAnimationFrame(f); else r(n/2)} requestAnimationFrame(f)})")
        print(j['name'],'fps',fps,'errs',errs[:4],flush=True); pg.close()
    b.close()
srv.shutdown()
