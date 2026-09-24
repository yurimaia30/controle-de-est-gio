const {test}=require('node:test');
const assert=require('node:assert/strict');
const D=require('../public/domain.js');
test('período inclusivo atravessa meses e respeita dias',()=>{
  assert.deepEqual(D.datesBetween('2026-08-30','2026-09-13',[0]),['2026-08-30','2026-09-06','2026-09-13']);
  assert.deepEqual(D.datesBetween('2026-09-23','2026-09-25',[1,3,5]),['2026-09-23','2026-09-25']);
});
test('datas invertidas, inexistentes ou sem dias são rejeitadas',()=>{
  for(const args of [['2026-02-30','2026-03-10',[1]],['2026-10-01','2026-09-01',[1]],['2026-09-01','2026-09-02',[]]])assert.throws(()=>D.datesBetween(...args));
});
test('ano bissexto e um único dia',()=>assert.deepEqual(D.datesBetween('2028-02-29','2028-02-29',[2]),['2028-02-29']));
test('IOT, SESI e UPA isolados; coordenação tem acesso geral',()=>{
  assert.equal(D.canAccess(null,'IOT'),false);
  for(const group of ['IOT','SESI','UPA'])for(const target of ['IOT','SESI','UPA','EXTERNO'])assert.equal(D.canAccess({role:'field',group},target),group===target);
  assert.equal(D.canAccess({role:'admin',name:'Yuri Maia'},'EXTERNO'),true);
  assert.equal(D.canAccess({role:'admin',name:'Outra pessoa'},'EXTERNO'),false);
});
test('oportunidade e presença não contam como horas autorizadas',()=>{
  assert.equal(D.approvedHours([],'a'),0);
  assert.equal(D.approvedHours([{studentId:'b',hours:24},{studentId:'a',hours:8}],'a'),8);
  assert.equal(D.attendanceId('op1','2026-09-23'),D.attendanceId('op1','2026-09-23'));
});
test('login por usuário normaliza maiúsculas sem exigir e-mail',()=>{
  assert.equal(D.loginAddress(' IOT '),'iot@acesso.controle-de-estagio.invalid');
  assert.equal(D.loginAddress('Yuri'),'yuri@acesso.controle-de-estagio.invalid');
  assert.throws(()=>D.loginAddress('outro'));
});
