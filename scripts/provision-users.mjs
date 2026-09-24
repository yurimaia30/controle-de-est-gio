// Trusted administrator machine only. Passwords are saved privately, never printed.
import fs from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {initializeApp,applicationDefault} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
const users=[['yuri','Yuri Maia'],['luiz','Luiz Paulo'],['iot','IOT'],['sesi','SESI'],['upa','UPA']];
initializeApp({credential:applicationDefault(),projectId:'controle-de-estagio'});
await fs.mkdir('private',{recursive:true});
const credentialsFile='private/senhas-iniciais-'+Date.now()+'.json',result=[];
for(const [username,name] of users){
  const email=username+'@acesso.controle-de-estagio.invalid',role=['yuri','luiz'].includes(username)?'admin':'field';
  let user;
  try{user=await getAuth().getUserByEmail(email);}catch(e){
    if(e.code!=='auth/user-not-found')throw e;
    const password=randomBytes(18).toString('base64url');
    user=await getAuth().createUser({email,password,displayName:name});
    result.push({usuario:username,senhaInicial:password});
    await fs.writeFile(credentialsFile,JSON.stringify(result,null,2),{mode:0o600});
  }
  await getFirestore().collection('profiles').doc(user.uid).set({name,username,role,group:role==='field'?name:null});
  console.log('Perfil configurado: '+username+'. Contas existentes mantêm sua senha.');
}
if(result.length)console.log('Senhas iniciais salvas em '+credentialsFile+'. Entregue a cada responsável apenas sua própria senha.');
