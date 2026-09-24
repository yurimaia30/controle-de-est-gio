import {before,after,test} from 'node:test';
import fs from 'node:fs/promises';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,getDocs,collection,query,where,serverTimestamp,Timestamp} from 'firebase/firestore';
let env;
const projectId='demo-radiologia';
const oldDate='2020-01-06', futureDate='2099-01-05';
const at=d=>Timestamp.fromDate(new Date(d+'T00:00:00-03:00'));
const op=(group,date=oldDate)=>({group,studentId:'student',dates:[date],dateTimes:{[date]:at(date)},hours:4,endAt:at(date)});
before(async()=>{
  env=await initializeTestEnvironment({projectId,firestore:{rules:await fs.readFile('firestore.rules','utf8')}});
  await env.withSecurityRulesDisabled(async c=>{
    const db=c.firestore();
    for(const [uid,profile] of Object.entries({yuri:{role:'admin',name:'Yuri Maia'},luiz:{role:'admin',name:'Luiz Paulo'},iot:{role:'field',group:'IOT'},sesi:{role:'field',group:'SESI'},upa:{role:'field',group:'UPA'}}))await setDoc(doc(db,'profiles',uid),profile);
    for(const group of ['IOT','SESI','UPA']){await setDoc(doc(db,'fields',group),{group,slots:[]});await setDoc(doc(db,'opportunities',group),op(group));}
    await setDoc(doc(db,'opportunities','future'),op('IOT',futureDate));
    await setDoc(doc(db,'students','student'),{nome:'Teste'});
    await setDoc(doc(db,'radcontrol','estado_principal'),{students:[]});
  });
});
after(async()=>{await env?.cleanup();});
const db=uid=>env.authenticatedContext(uid).firestore();
const entry=(uid,opportunityId='IOT',date=oldDate)=>({opportunityId,group:'IOT',date,dateAt:at(date),status:'presente',recordedBy:uid,updatedAt:serverTimestamp()});
const approval=uid=>({studentId:'student',group:'IOT',hours:4,presentDates:[oldDate],approvedBy:uid,approvedName:uid==='yuri'?'Yuri Maia':'Luiz Paulo',approvedAt:serverTimestamp()});
test('anônimo não lê nem grava',async()=>{await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'fields','IOT')));});
test('campo só lê seu grupo e não consulta lista geral',async()=>{
  for(const uid of ['iot','sesi','upa']){
    const own=uid.toUpperCase(),other=own==='IOT'?'SESI':'IOT';
    await assertSucceeds(getDoc(doc(db(uid),'fields',own)));
    await assertFails(getDoc(doc(db(uid),'fields',other)));
    await assertSucceeds(getDocs(query(collection(db(uid),'opportunities'),where('group','==',own))));
    await assertFails(getDocs(collection(db(uid),'opportunities')));
    await assertFails(getDoc(doc(db(uid),'students','student')));
    await assertFails(getDoc(doc(db(uid),'radcontrol','estado_principal')));
    await assertFails(setDoc(doc(db(uid),'fields',own),{group:own,slots:[]}));
    await assertFails(setDoc(doc(db(uid),'profiles',uid),{role:'admin',name:'Yuri Maia'}));
  }
});
test('chamada exige campo, data e autor corretos; não permite futuro',async()=>{
  await assertFails(setDoc(doc(db('sesi'),'attendance','IOT_'+oldDate),entry('sesi')));
  await assertFails(setDoc(doc(db('iot'),'attendance','IOT_2020-01-07'),entry('iot','IOT','2020-01-07')));
  await assertFails(setDoc(doc(db('iot'),'attendance','future_'+futureDate),entry('iot','future',futureDate)));
  await assertFails(setDoc(doc(db('iot'),'attendance','IOT_'+oldDate),entry('yuri')));
  await assertSucceeds(setDoc(doc(db('iot'),'attendance','IOT_'+oldDate),entry('iot')));
  await assertSucceeds(setDoc(doc(db('iot'),'attendance','IOT_'+oldDate),entry('iot')));
});
test('somente coordenação autoriza, após fim, uma vez',async()=>{
  await assertFails(setDoc(doc(db('iot'),'approvals','IOT'),approval('iot')));
  await assertFails(setDoc(doc(db('yuri'),'approvals','future'),{...approval('yuri'),presentDates:[futureDate]}));
  await assertSucceeds(setDoc(doc(db('yuri'),'approvals','IOT'),approval('yuri')));
  await assertFails(setDoc(doc(db('luiz'),'approvals','IOT'),approval('luiz')));
  await assertFails(setDoc(doc(db('iot'),'attendance','IOT_'+oldDate),entry('iot')));
});
