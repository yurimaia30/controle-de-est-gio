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
test('saldo histórico autorizado soma uma única vez com novas aprovações',()=>{
  const s={id:'a',horasPlanilha:210,historico:[{horas:210}],historicalAuthorization:{authorized:true}};
  assert.equal(D.totalHours([],s),210);
  assert.equal(D.totalHours([{studentId:'a',hours:8},{studentId:'b',hours:100}],s),218);
  assert.equal(D.totalHours([],{id:'b',horasPlanilha:300}),0);
  assert.equal(D.totalHours([],{id:'c'}),0);
});
test('TCE: vencimento inclusivo, faixas de alerta e início futuro',()=>{
  const status=(start,end)=>D.tceStatus({start,end},'2026-09-24');
  assert.equal(status('2026-09-01','2026-09-23').label,'Vencido');
  assert.deepEqual(status('2026-09-01','2026-09-24'),{label:'Vence em até 7 dias',days:0,active:true});
  assert.equal(status('2026-09-01','2026-10-09').label,'Vence em até 15 dias');
  assert.equal(status('2026-09-01','2026-10-24').label,'Vence em até 30 dias');
  assert.equal(status('2026-09-01','2026-10-25').label,'Ativo');
  assert.equal(status('2026-09-27','2026-12-13').label,'A iniciar');
  assert.equal(status('','').label,'Sem término');
});
