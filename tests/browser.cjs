const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.CODEX_NODE_MODULES,'playwright'));
const seed=JSON.parse(fs.readFileSync('private/importacao-planilhas.json','utf8'));
const server=http.createServer((req,res)=>{const file=path.join(process.cwd(),'public',req.url==='/'?'index.html':req.url);fs.readFile(file,(e,b)=>{res.statusCode=e?404:200;res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':'text/html');res.end(e?'':b);});});
function mock({seed,role}){
  const op={id:'test-op',group:'IOT',fieldId:'IOT',fieldName:'IOT',studentName:'Aluno Teste',studentId:'test-student',turma:'RAD19',start:'2026-09-21',end:'2026-09-21',days:[1,3],hours:4,dates:['2026-09-21'],dateTimes:{'2026-09-21':1}};
  const store={fields:Object.fromEntries(seed.fields.map(f=>[f.id,f])),students:{'test-student':{id:'test-student',nome:'Aluno Teste',turma:'RAD19',historico:[],horasPlanilha:200}},opportunities:{'test-op':op},attendance:{},approvals:{},settings:{},profiles:{tester:role}};
  const listeners=[];window.testStore=store;window.testQueries=[];
  const snapshot=(c,id)=>({id,exists:!!store[c]?.[id],data:()=>store[c]?.[id],ref:doc(c,id)});
  const doc=(c,id)=>({id,get:async()=>snapshot(c,id),set:async v=>{store[c][id]=v;emit();},_c:c,_id:id});
  function emit(){for(const l of listeners){const entries=Object.entries(store[l.c]||{}).filter(([id,x])=>!l.where||x[l.where[0]]===l.where[2]);l.fn({metadata:{fromCache:false},docs:entries.map(([id])=>snapshot(l.c,id))});}}
  function collection(c,where){return {doc:id=>doc(c,id||'new-op'),where:(...args)=>collection(c,args),onSnapshot:fn=>{window.testQueries.push({c,where});const l={c,where,fn};listeners.push(l);queueMicrotask(emit);return()=>listeners.splice(listeners.indexOf(l),1);},add:async v=>{const r=doc(c,'new-student');await r.set(v);return r;}};}
  function writer(){const ops=[];return {get:async r=>snapshot(r._c,r._id),set:(r,v)=>ops.push(()=>store[r._c][r._id]=v),update:(r,v)=>ops.push(()=>Object.assign(store[r._c][r._id],v)),commit:async()=>{ops.forEach(f=>f());emit();}};}
  const db={collection,batch:writer,runTransaction:async fn=>{const tx=writer();await fn(tx);await tx.commit();}};
  const auth={currentUser:{uid:'tester'},onAuthStateChanged:fn=>queueMicrotask(()=>fn({uid:'tester'})),signOut:async()=>{},signInWithEmailAndPassword:async()=>{}};
  window.firebase={initializeApp(){},firestore:()=>db,auth:()=>auth};firebase.firestore.FieldValue={serverTimestamp:()=>new Date().toISOString()};firebase.firestore.Timestamp={fromDate:d=>d.toISOString()};
}
(async()=>{
  await new Promise(r=>server.listen(4175,'127.0.0.1',r));
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    for(const group of ['IOT','SESI','UPA']){
      const page=await browser.newPage();page.on('pageerror',e=>console.log('PAGE ERROR',e.message));page.on('console',m=>console.log('BROWSER',m.text()));await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:4175')?r.continue():r.fulfill({body:'',contentType:'text/javascript'}));await page.addInitScript(mock,{seed,role:{name:group,role:'field',group}});
      await page.goto('http://127.0.0.1:4175');await page.waitForSelector('#app:not([hidden])');
      assert.equal(await page.locator('#nav button').count(),2);
      const queries=await page.evaluate(()=>testQueries);assert(queries.every(q=>q.where?.[2]===group));
      assert.equal(await page.locator('[data-action="slot"]').count(),0);
      const headings=await page.locator('#content h2').allTextContents();assert(headings.every(t=>t.includes(group)));
      if(group==='IOT'){
        await page.locator('[data-view="attendance"]').click();await page.locator('#att-date').fill('2026-09-21');await page.locator('#att-date').dispatchEvent('change');
        await page.locator('[name="test-op"]').selectOption('presente');await page.locator('#attendance-form button').click();
        await page.waitForFunction(()=>Object.keys(testStore.attendance).length===1);
        await page.locator('#attendance-form button').click();assert.equal(await page.evaluate(()=>Object.keys(testStore.attendance).length),1);assert.equal(await page.evaluate(()=>Object.keys(testStore.approvals).length),0);
      }
      await page.close();
    }
    const page=await browser.newPage({viewport:{width:1400,height:1000}});await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:4175')?r.continue():r.fulfill({body:'',contentType:'text/javascript'}));await page.addInitScript(mock,{seed,role:{name:'Yuri Maia',role:'admin',group:null}});await page.goto('http://127.0.0.1:4175');await page.waitForSelector('[data-view="approvals"]');
    await page.locator('[data-view="fields" ]').click();
    assert.equal(await page.locator('#content h2').count(),7);
    fs.mkdirSync('tmp',{recursive:true});await page.screenshot({path:'tmp/campos.png',fullPage:true});
    await page.locator('[data-view="attendance"]').click();await page.locator('#att-date').fill('2026-09-21');await page.locator('#att-date').dispatchEvent('change');await page.locator('[name="test-op"]').selectOption('presente');await page.locator('#attendance-form button').click();
    await page.locator('[data-view="approvals"]').click();await page.locator('[data-action="approve"]').click();await page.locator('[data-action="confirm-approval"]').click();await page.waitForFunction(()=>testStore.approvals['test-op']?.hours===4);
    assert.equal(await page.evaluate(()=>testStore.approvals['test-op'].approvedName),'Yuri Maia');
    await page.locator('[data-view="students"]').click();assert((await page.locator('#content').innerText()).includes('4h'));
    console.log('UI simulada: três campos isolados, chamada idempotente, nenhuma hora automática e autorização nominal OK.');
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});




