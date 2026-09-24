// Read-only production checks. Tokens and passwords are never logged.
import fs from 'node:fs/promises';
const files=(await fs.readdir('private')).filter(f=>f.startsWith('senhas-iniciais-')&&f.endsWith('.json')).sort();
const accounts=(await Promise.all(files.map(f=>fs.readFile('private/'+f,'utf8').then(JSON.parse)))).flat();
const key='AIzaSyCoORFFThLbMHuij86ft1Hjs1lxOdzjHj8';
const base='https://firestore.googleapis.com/v1/projects/controle-de-estagio/databases/(default)/documents';
if(new Set(accounts.map(a=>a.usuario)).size!==5)throw Error('Precisamos dos cinco acessos recém-criados para este teste.');
for(const name of ['yuri','luiz','iot','sesi','upa']){
  const account=accounts.filter(a=>a.usuario===name).at(-1);
  const response=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key='+key,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:name+'@acesso.controle-de-estagio.invalid',password:account.senhaInicial,returnSecureToken:true})});
  const session=await response.json();
  if(!response.ok)throw Error('Falha de login para '+name+': '+(session.error?.message||response.status));
  const headers={Authorization:'Bearer '+session.idToken};
  const profile=await fetch(base+'/profiles/'+session.localId,{headers});
  if(!profile.ok)throw Error('Perfil indisponível: '+name);
  const own=['yuri','luiz'].includes(name)?'IOT':name==='upa'?'UPA-G1':name.toUpperCase();
  if(!(await fetch(base+'/fields/'+own,{headers})).ok)throw Error('Campo próprio indisponível: '+name);
  if(!['yuri','luiz'].includes(name)){
    const other=name==='iot'?'SESI':'IOT';
    for(const path of ['/fields/'+other,'/students/planilha-linha-3','/radcontrol/estado_principal']){
      if((await fetch(base+path,{headers})).status!==403)throw Error('Isolamento incorreto para '+name+' em '+path);
    }
  }else{
    if(!(await fetch(base+'/students/planilha-linha-3',{headers})).ok)throw Error('Cadastro administrativo indisponível');
  }
  console.log(name+': login, perfil e leituras permitidas/bloqueadas OK');
}
console.log('Cinco acessos validados no Firebase real, sem alterar frequências ou horas.');
