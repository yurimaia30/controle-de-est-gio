// Idempotent import into the same Firebase project; existing documents are preserved.
import fs from 'node:fs/promises';
import {initializeApp,applicationDefault} from 'firebase-admin/app';
import {getFirestore,FieldValue} from 'firebase-admin/firestore';
initializeApp({credential:applicationDefault(),projectId:'controle-de-estagio'});
const db=getFirestore(), data=JSON.parse(await fs.readFile('private/importacao-planilhas.json','utf8'));
if(data.version!==2||data.students.length!==89)throw Error('Arquivo de importação inválido');
await db.runTransaction(async tx=>{
  const marker=db.collection('settings').doc('import-v2');
  if((await tx.get(marker)).exists){console.log('Importação já realizada; nada alterado.');return;}
  const entries=[...data.fields.map(f=>[db.collection('fields').doc(f.id),f]),...data.students.map(s=>[db.collection('students').doc(s.id),s]),[db.collection('settings').doc('waitlist'),{items:data.waitlist}]];
  const snapshots=await tx.getAll(...entries.map(([ref])=>ref));
  entries.forEach(([ref,value],i)=>{if(!snapshots[i].exists)tx.set(ref,value);});
  tx.set(marker,{createdBy:'importacao-administrativa',createdAt:FieldValue.serverTimestamp(),source:'Planilha de Estágio - Radiologia.xlsx e CONTROLE DE HORAS.xlsx'});
});
console.log('Importação conferida; documento legado preservado.');
