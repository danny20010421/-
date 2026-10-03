(function(){
  const K='FAKEDB3'; const load=()=>JSON.parse(localStorage.getItem(K)||'{}'); let DB=load();
  const subs=[]; const fire=()=>{subs.forEach(s=>{try{s()}catch(e){console.error(e)}})};
  const save=()=>{localStorage.setItem(K,JSON.stringify(DB)); fire();};
  window.addEventListener('storage',e=>{if(e.key===K){DB=load();fire();}});
  const col=n=>(DB[n]=DB[n]||{});
  const me=JSON.parse(sessionStorage.getItem('FAKEUSER')||'null');
  let cb=null,user=me?{...me,updateProfile:async()=>{},providerData:[{providerId:'password'}]}:null;
  const auth={setPersistence:async()=>{},onAuthStateChanged:f=>{cb=f;setTimeout(()=>f(user),0)},getRedirectResult:async()=>null,signOut:async()=>{user=null;cb&&cb(null)},sendPasswordResetEmail:async e=>{window.__reset=e}};
  const setPath=(o,path,v)=>{const ks=path.split('.');let x=o;for(let i=0;i<ks.length-1;i++){x[ks[i]]=x[ks[i]]||{};x=x[ks[i]]}x[ks[ks.length-1]]=v};
  const docRef=(c,id)=>({id,get:async()=>({exists:!!col(c)[id],id,data:()=>JSON.parse(JSON.stringify(col(c)[id]))}),set:async(d,o)=>{col(c)[id]=o&&o.merge?{...(col(c)[id]||{}),...d}:JSON.parse(JSON.stringify(d));save()},
    update:async d=>{const cur=col(c)[id];if(!cur)throw Object.assign(new Error('nf'),{code:'not-found'});Object.entries(d).forEach(([k,v])=>setPath(cur,k,JSON.parse(JSON.stringify(v===undefined?null:v))));save()},delete:async()=>{delete col(c)[id];save()},
    onSnapshot:(f)=>{let last=null;const s=()=>{const d=col(c)[id];const j=JSON.stringify(d);if(j===last)return;last=j;f({exists:!!d,data:()=>JSON.parse(j)})};subs.push(s);setTimeout(s,0);return()=>{const i=subs.indexOf(s);if(i>=0)subs.splice(i,1)}}});
  const query=(c,fs,lim)=>{const run=()=>{let docs=Object.entries(col(c)).filter(([id,d])=>fs.every(([f,op,v])=>op==='=='?d[f]===v:op==='in'?v.includes(d[f]):op==='array-contains'?(d[f]||[]).includes(v):true)).map(([id,d])=>({id,data:()=>JSON.parse(JSON.stringify(d))}));if(lim)docs=docs.slice(0,lim);return {empty:!docs.length,docs}};
    return {orderBy:(f,dir)=>{const q=query(c,fs,lim);const g=q.get;q.get=async()=>{const r=await g();r.docs.sort((a,b)=>(b.data()[f]||0)-(a.data()[f]||0));return r};q.limit=n=>{const q2=query(c,fs,n);const g2=q2.get;q2.get=async()=>{const all=await query(c,fs).get();all.docs.sort((a,b)=>(b.data()[f]||0)-(a.data()[f]||0));all.docs=all.docs.slice(0,n);return all};return q2};return q},where:(f,op,v)=>query(c,[...fs,[f,op,v]],lim),limit:n=>query(c,fs,n),get:async()=>run(),onSnapshot:f=>{let last=null;const s=()=>{const r=run();const j=JSON.stringify(r.docs.map(d=>d.id));if(j===last)return;last=j;f(r)};subs.push(s);setTimeout(s,0);return()=>{}}}};
  const db={collection:c=>({doc:id=>docRef(c,id),orderBy:(f,d)=>query(c,[]).orderBy(f,d),where:(f,op,v)=>query(c,[[f,op,v]]),add:async d=>{const id='a'+Math.random().toString(36).slice(2,9);col(c)[id]=JSON.parse(JSON.stringify(d));save();return docRef(c,id)}}),runTransaction:async fn=>fn({get:r=>r.get(),set:(r,d)=>r.set(d),update:(r,d)=>r.update(d),delete:r=>r.delete()})};
  const F={apps:[],initializeApp(){F.apps.push(1)},app(){},auth(){return auth},firestore(){return db}};
  F.auth.Auth={Persistence:{LOCAL:'l'}};F.firestore.FieldValue={serverTimestamp:()=>'ts'};
  window.firebase=F; window.__db=()=>DB;
})();
