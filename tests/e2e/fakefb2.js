(function(){
  const DB=JSON.parse(sessionStorage.getItem('FAKEDB')||'{}'); const save=()=>sessionStorage.setItem('FAKEDB',JSON.stringify(DB)); const col=n=>(DB[n]=DB[n]||{});
  let cb=null,user=null; const mkUser=(uid,email,name)=>({uid,email,displayName:name,updateProfile:async p=>{user.displayName=p.displayName},delete:async()=>{},sendEmailVerification:async()=>{}});
  const accounts=JSON.parse(sessionStorage.getItem('FAKEACC')||'{}');
  const auth={setPersistence:async()=>{},onAuthStateChanged:f=>{cb=f;setTimeout(()=>f(user),0)},getRedirectResult:async()=>null,
    signInWithPopup:async()=>{user=mkUser('g1','g@x.com','G');cb&&cb(user)},signOut:async()=>{user=null;cb&&cb(null)},
    createUserWithEmailAndPassword:async(e,p)=>{if(accounts[e]){const er=new Error('x');er.code='auth/email-already-in-use';throw er}accounts[e]={p,uid:'u'+Object.keys(accounts).length+'x'};sessionStorage.setItem('FAKEACC',JSON.stringify(accounts));user=mkUser(accounts[e].uid,e,'');setTimeout(()=>cb&&cb(user),0);return {user}},
    signInWithEmailAndPassword:async(e,p)=>{const a=accounts[e];if(!a||a.p!==p){const er=new Error('x');er.code='auth/invalid-credential';throw er}user=mkUser(a.uid,e,'');cb&&cb(user);return {user}},
    sendPasswordResetEmail:async e=>{window.__reset=e}};
  const docRef=(c,id)=>({id,get:async()=>({exists:!!col(c)[id],id,data:()=>col(c)[id]}),set:async(d,o)=>{col(c)[id]=o&&o.merge?{...(col(c)[id]||{}),...d}:d;save()},update:async d=>{col(c)[id]={...col(c)[id],...d};save()},delete:async()=>{delete col(c)[id];save()}});
  const query=(c,fs,lim)=>({where:(f,op,v)=>query(c,[...fs,[f,op,v]],lim),limit:n=>query(c,fs,n),get:async()=>{let docs=Object.entries(col(c)).filter(([id,d])=>fs.every(([f,op,v])=>op==='=='?d[f]===v:op==='array-contains'?(d[f]||[]).includes(v):true)).map(([id,d])=>({id,data:()=>d}));if(lim)docs=docs.slice(0,lim);return {empty:!docs.length,docs}}});
  const db={collection:c=>({doc:id=>docRef(c,id),where:(f,op,v)=>query(c,[[f,op,v]]),add:async d=>{const id='a'+Math.random().toString(36).slice(2);col(c)[id]=d;save();return docRef(c,id)}}),
    runTransaction:async fn=>fn({get:r=>r.get(),set:(r,d)=>r.set(d)})};
  const F={apps:[],initializeApp(){F.apps.push(1)},app(){},auth(){return auth},firestore(){return db}};
  F.auth.Auth={Persistence:{LOCAL:'l'}};F.auth.GoogleAuthProvider=function(){this.setCustomParameters=()=>{}};F.firestore.FieldValue={serverTimestamp:()=>'ts'};
  window.firebase=F; window.__DB=DB;
  // 預先放一位好友候選人與他送來的邀請
  if(!col('players').u2){col('players').u2={uid:'u2',username:'Luffy',name:'草帽',pid:'12345678',lv:30,title:'海賊',avatar:'luffy',team:[{id:'luffy',lv:40},{id:'zoro',lv:40}],wins:3,losses:1};col('usernames').luffy={uid:'u2',email:'l@x.com',name:'Luffy'};save();}
})();
