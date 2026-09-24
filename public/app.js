'use strict';
firebase.initializeApp({apiKey:'AIzaSyCoORFFThLbMHuij86ft1Hjs1lxOdzjHj8',authDomain:'controle-de-estagio.firebaseapp.com',projectId:'controle-de-estagio',storageBucket:'controle-de-estagio.firebasestorage.app',messagingSenderId:'486243951117',appId:'1:486243951117:web:c3591bfe95d3166384ab44'});
const db=firebase.firestore(), auth=firebase.auth(), stamp=firebase.firestore.FieldValue.serverTimestamp;
const $=id=>document.getElementById(id), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>v?v.split('-').reverse().join('/'):'Não informado';
let profile=null, unsub=[], fields=[], students=[], opportunities=[], attendance=[], approvals=[], settings={}, view='fields', selectedField='', selectedDate=Domain.today();
const drafts=new Map();
let studentSearch='',studentOrder='alpha';
const admin=()=>profile?.role==='admin'&&['Yuri Maia','Luiz Paulo'].includes(profile.name), accessible=g=>Domain.canAccess(profile,g);
function notify(message,error=false){$('message').hidden=false;$('message').textContent=message;$('message').style.borderColor=error?'#fb7185':'#277487';}
function failure(e){console.error(e);const message=e.code==='permission-denied'?'Acesso negado. Verifique o perfil e as regras do Firebase.':e.message||'Não foi possível salvar. Tente novamente.';notify(message,true);if($('dialog').open){let p=$('dialog-error');if(!p){p=document.createElement('p');p.id='dialog-error';p.className='warning';p.setAttribute('role','alert');$('dialog-content').prepend(p);}p.textContent=message;}}
function mustAdmin(){if(!admin())throw Error('Apenas Yuri ou Luiz podem realizar esta operação.');}
function modal(html){$('dialog-content').innerHTML=html;if(!$('dialog').open)$('dialog').showModal();}
function button(label,action,data='',cls='secondary'){return `<button class="${cls}" data-action="${action}" data-id="${esc(data)}">${label}</button>`;}
function watch(collection,assign,restricted=true){
  let query=db.collection(collection);
  if(!admin()&&restricted)query=query.where('group','==',profile.group);
  unsub.push(query.onSnapshot(s=>{assign(s.docs.map(d=>({id:d.id,...d.data()})));$('connection').textContent=s.metadata.fromCache?'Dados em cache · aguardando conexão':'Firebase conectado';render();},failure));
}
auth.onAuthStateChanged(async user=>{
  unsub.forEach(fn=>fn());unsub=[];profile=null;fields=[];students=[];opportunities=[];attendance=[];approvals=[];settings={};drafts.clear();
  $('app').hidden=true;$('login').hidden=false;$('content').innerHTML='';$('dialog').close();
  if(!user)return;
  try{
    const doc=await db.collection('profiles').doc(user.uid).get();
    if(!doc.exists)throw Error('Conta sem perfil de acesso. A coordenação precisa cadastrar seu perfil.');
    profile=doc.data();
    if(!['admin','field'].includes(profile.role)||(profile.role==='field'&&!['IOT','SESI','UPA'].includes(profile.group)))throw Error('Perfil inválido.');
    $('identity').textContent=profile.name+' · '+(admin()?'Coordenação':profile.group);
    $('login').hidden=true;$('app').hidden=false;view=admin()?'dashboard':'fields';
    watch('fields',v=>fields=v);watch('opportunities',v=>opportunities=v);watch('attendance',v=>attendance=v);
    if(admin()){watch('students',v=>students=v,false);watch('approvals',v=>approvals=v,false);watch('settings',v=>settings=Object.fromEntries(v.map(x=>[x.id,x])),false);}
    render();
  }catch(e){$('login-error').textContent=e.message;await auth.signOut();}
});
$('login-form').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target);$('login-error').textContent='';const submit=e.target.querySelector('button');submit.disabled=true;try{await auth.signInWithEmailAndPassword(Domain.loginAddress(f.get('username')),f.get('password'));e.target.reset();}catch(err){$('login-error').textContent='Não foi possível entrar. Confira usuário e senha ou solicite a ativação à coordenação.';}finally{submit.disabled=false;}});
$('password-help').onclick=()=>{$('login-error').textContent='Solicite a redefinição da senha à coordenação. Este acesso não utiliza e-mail pessoal.';};
$('logout').onclick=()=>auth.signOut();$('close-dialog').onclick=()=>$('dialog').close();
const views={dashboard:'Dashboard',tces:'Controle de TCEs',fields:'Campos e vagas',attendance:'Chamada por campo',students:'Controle de horas',external:'Estágios externos',approvals:'Autorizar horas',waitlist:'Lista de espera',setup:'Importar planilhas',preceptors:'Preceptores'};
function render(){
  if(!profile)return;
  const allowed=admin()?Object.keys(views):['fields','attendance'];if(!allowed.includes(view))view='fields';
  $('nav').innerHTML=allowed.map(v=>`<button class="${v===view?'active':''} nav-btn" data-view="${v}">${views[v]}</button>`).join('');
  $('page-title').textContent=views[view];
  ({dashboard:renderDashboard,tces:renderTces,fields:renderFields,attendance:renderAttendance,students:renderStudents,external:renderExternal,approvals:renderApprovals,waitlist:renderWaitlist,setup:renderSetup,preceptors:renderPreceptors}[view])();
  restoreDrafts(); decorateInterface();
}
function restoreDrafts(){document.querySelectorAll('#attendance-form select').forEach(select=>{const value=drafts.get(Domain.attendanceId(select.name,selectedDate));if(value)select.value=value;});}
const tces=()=>Object.values(settings).filter(s=>s.type==='tce');
const hoursText=n=>Number(n).toLocaleString('pt-BR')+'h';
function tceRows(items){return items.map(t=>{const s=Domain.tceStatus(t);return `<tr><td>${esc(t.studentName)}</td><td>${esc(t.number)||'—'}</td><td>${esc(t.fieldName)||'—'}</td><td>${fmt(t.start)} a ${fmt(t.end)}</td><td class="${s.label==='Vencido'?'expired':s.days!==null&&s.days<=30?'warning':'good'}">${s.label}${s.days===0?' · hoje':''}</td><td>${button('Editar TCE','tce',t.id)}</td></tr>`;}).join('');}
function tceTable(items){return `<div class="card scroll"><table><thead><tr><th>Aluno</th><th>TCE</th><th>Campo</th><th>Vigência</th><th>Situação</th><th>Ação</th></tr></thead><tbody>${tceRows(items)||'<tr><td colspan="6">Nenhum TCE nesta situação.</td></tr>'}</tbody></table></div>`;}
function renderDashboard(){
  mustAdmin();const contracts=tces(),states=contracts.map(t=>Domain.tceStatus(t)),totals=students.map(s=>Domain.totalHours(approvals,s));
  const stat=(label,value)=>`<article class="card"><small>${label}</small><div class="stat">${value}</div></article>`;
  const alerts=contracts.filter(t=>{const s=Domain.tceStatus(t);return s.days!==null&&s.days<=30;}).sort((a,b)=>a.end.localeCompare(b.end));
  $('content').innerHTML=`<p>Dados do Firebase. As horas históricas da planilha foram autorizadas por Yuri e Luiz; novas horas entram somente após o encerramento e aprovação.</p><div class="kpis">${stat('Alunos com menos de 400h',totals.filter(h=>h<400).length)}${stat('Alunos com 400h ou mais',totals.filter(h=>h>=400).length)}${stat('Horas autorizadas',hoursText(totals.reduce((a,b)=>a+b,0)))}${stat('Horas pendentes para 400h',hoursText(totals.reduce((a,b)=>a+Math.max(0,400-b),0)))}</div><h2>Vigência dos TCEs</h2><div class="kpis">${stat('TCEs ativos',states.filter(s=>s.active).length)}${stat('Vencem em até 30 dias',states.filter(s=>s.active&&s.days<=30).length)}${stat('Vencem em até 15 dias',states.filter(s=>s.active&&s.days<=15).length)}${stat('Vencem em até 7 dias',states.filter(s=>s.active&&s.days<=7).length)}${stat('TCEs vencidos',states.filter(s=>s.label==='Vencido').length)}${stat('TCEs a iniciar',states.filter(s=>s.label==='A iniciar').length)}</div><p>As faixas de 7, 15 e 30 dias se sobrepõem. O TCE permanece ativo no dia do vencimento.</p><h2>Situação dos campos</h2><div class="grid">${fields.map(f=>{const usable=f.slots.filter(s=>!s.bloqueada),used=usable.filter(s=>s.aluno).length;return `<article class="card"><h3>${esc(f.nome)} · ${esc(f.turno)}</h3><p>☢ ${esc(f.preceptor)}</p><strong>${used} ocupadas · ${usable.length-used} livres</strong><p>${usable.length} vagas/dias disponíveis · ${f.slots.length-usable.length} bloqueadas</p>${!usable.length?'<p class="warning">Capacidade ainda não informada.</p>':`<progress value="${used}" max="${usable.length}" aria-label="Ocupação de ${esc(f.nome)}"></progress>`}<button data-view="fields" class="secondary">Ver quadro</button></article>`;}).join('')}</div><h2>Alertas de vencimento</h2>${tceTable(alerts)}<h2>Alunos próximos de 400h</h2><div class="card">${students.filter(s=>{const h=Domain.totalHours(approvals,s);return h>=360&&h<400;}).map(s=>`<p>${esc(s.nome)} · ${hoursText(Domain.totalHours(approvals,s))} / 400h</p>`).join('')||'<p>Nenhum aluno entre 360h e 400h.</p>'}</div>`;
}
function renderTces(){mustAdmin();$('content').innerHTML=`<p>TCEs recuperados do cadastro anterior e novos registros da coordenação. Editar a vigência do TCE não altera as datas das oportunidades nem autoriza horas.</p><div class="toolbar">${button('Cadastrar TCE','tce','','primary')}</div>${tceTable(tces().sort((a,b)=>(a.end||'9999').localeCompare(b.end||'9999')))}`;}
function tceModal(id){
  mustAdmin();const t=settings[id]||{};
  modal(`<h2>${id?'Editar':'Cadastrar'} TCE</h2><form id="tce-form"><input type="hidden" name="id" value="${esc(id)}"><label>Aluno<input name="studentName" list="student-names" value="${esc(t.studentName)}" required><datalist id="student-names">${students.map(s=>`<option value="${esc(s.nome)}"></option>`).join('')}</datalist></label><label>Número do TCE<input name="number" value="${esc(t.number)}"></label><label>Campo ou instituição<input name="fieldName" list="field-names" value="${esc(t.fieldName)}" required><datalist id="field-names">${fields.map(f=>`<option value="${esc(f.nome)}"></option>`).join('')}</datalist></label><div class="form-grid"><label>Início<input type="date" name="start" value="${esc(t.start)}" required></label><label>Término<input type="date" name="end" value="${esc(t.end)}" required></label></div><button>Salvar TCE</button></form>`);
}
function renderFields(){
  $('content').innerHTML=fields.length?fields.map(f=>{
    const available=f.slots.filter(s=>!s.bloqueada&&!s.aluno).length;
    const days=[1,2,3,4,5,6,0].filter(day=>f.slots.some(s=>s.dias.includes(day)));
    const tables=days.map(day=>{
      const slots=f.slots.filter(s=>s.dias.includes(day)).sort((a,b)=>a.vaga-b.vaga);
      const free=slots.filter(s=>!s.bloqueada&&!s.aluno).length,occupied=slots.filter(s=>!s.bloqueada&&s.aluno).length,blocked=slots.filter(s=>s.bloqueada).length;
      return `<section class="day-panel" aria-label="${esc(f.nome)} · ${Domain.days[day]}"><div class="day-heading"><h3>${Domain.days[day]}</h3><span class="${free?'good':'locked'}">${free} ${free===1?'vaga livre':'vagas livres'}</span></div><p class="day-summary">${occupied} ocupadas${blocked?' · '+blocked+' bloqueadas':''}</p><table><thead><tr><th>Vaga</th><th>Aluno</th></tr></thead><tbody>${slots.map(s=>`<tr class="${!s.bloqueada&&!s.aluno?'free-slot':''}"><td>${s.vaga}</td><td>${s.bloqueada?'<span class="locked">X · indisponível</span>':s.aluno?`<strong>${esc(s.aluno)}</strong>`:'<strong class="good">Disponível</strong>'}${s.aluno?`<small class="slot-period">${s.inicio||s.fim?fmt(s.inicio)+' a '+fmt(s.fim):'Período não cadastrado'}</small>`:''}${s.obs?`<p class="note slot-note">${esc(s.obs)}</p>`:''}${admin()?`<details class="slot-actions"><summary>Gerenciar vaga</summary><div>${!s.bloqueada?button(s.aluno?'Cadastrar período / ficha':'Alocar aluno','slot',f.id+'|'+s.id):''}${button('Observação','slot-note',f.id+'|'+s.id)}${s.aluno?button('Liberar','release',f.id+'|'+s.id,'danger'):''}</div></details>`:''}</td></tr>`).join('')}</tbody></table></section>`;
    }).join('');
    return `<article class="card field-card"><div class="row between"><div><span class="badge">${esc(f.group)}</span><h2>${esc(f.nome)} · ${esc(f.turno)}</h2><p><span class="radiation" aria-label="Radiologia">☢</span> ${esc(f.preceptor)}</p></div><div><p>${available} vagas/dias livres</p>${admin()?button('Nova oportunidade','op',f.id):''}</div></div><div class="days-grid">${tables}</div>${!f.slots.length?'<p class="warning">Vagas não informadas na planilha.</p>':''}<h3 style="margin-top:20px">Observações do campo</h3><p class="note">${esc(f.observacoes)||'Nenhuma observação.'}</p>${admin()?button('Editar observações','field-note',f.id):''}${admin()&&f.id==='UPA-MANHA'?button('Cadastrar vaga confirmada','new-slot',f.id):''}</article>`;
  }).join(''):'<div class="card empty">Nenhum campo disponível. A coordenação deve importar o quadro das planilhas.</div>';
}
function renderAttendance(){
  if(!fields.some(f=>f.id===selectedField))selectedField=fields[0]?.id||'';
  const f=fields.find(f=>f.id===selectedField);
  const ops=opportunities.filter(o=>o.fieldId===selectedField&&o.dates.includes(selectedDate));
  $('content').innerHTML=`<div class="card"><div class="row toolbar"><label>Campo<select id="att-field">${fields.map(f=>`<option value="${f.id}" ${f.id===selectedField?'selected':''}>${esc(f.nome)}</option>`).join('')}</select></label><label>Data<input id="att-date" type="date" value="${selectedDate}" max="${Domain.today()}"></label></div><p><span class="radiation">☢</span> ${esc(f?.preceptor||'')}</p><p>Somente alunos com período e dias cadastrados aparecem na chamada. A presença fica pendente até o encerramento e a autorização de Yuri ou Luiz.</p><form id="attendance-form">${ops.map(o=>{const a=attendance.find(a=>a.id===Domain.attendanceId(o.id,selectedDate));return `<div class="row between card"><div><strong>${esc(o.studentName)}</strong><small> · ${esc(o.turma)} · ${o.hours}h previstas</small><p>${fmt(o.start)} a ${fmt(o.end)}</p></div><label>Situação<select name="${o.id}" required><option value="">Não registrada</option><option value="presente" ${a?.status==='presente'?'selected':''}>Presente</option><option value="falta" ${a?.status==='falta'?'selected':''}>Falta</option></select></label></div>`;}).join('')||'<p class="empty">Nenhum aluno com oportunidade cadastrada para este campo e esta data.</p>'}${ops.length?'<button>Salvar chamada</button>':''}</form></div>`;
}
function opRows(ops){return ops.map(o=>`<tr><td>${esc(o.studentName)}<small><br>${esc(o.turma)}</small></td><td>${esc(o.local||o.fieldName)}</td><td>${fmt(o.start)} a ${fmt(o.end)}<small><br>${o.days.map(d=>Domain.days[d]).join(', ')}</small></td><td>${o.dates.length*o.hours}h previstas</td><td>${button('Baixar ficha PDF','pdf',o.id)}</td></tr>`).join('');}
function renderStudents(){
  const focused=document.activeElement?.id==='student-search',cursor=focused?document.activeElement.selectionStart:null;
  $('content').innerHTML=`<p>Horas da planilha CONTROLE DE HORAS já autorizadas por Yuri e Luiz compõem o saldo histórico. As novas horas só entram após o término e a autorização.</p><div class="row toolbar">${button('Cadastrar aluno','student','','primary')}${button('Nova oportunidade','op','','primary')}</div><div class="card"><div class="row toolbar"><label>Pesquisar aluno ou turma<input id="student-search" type="search" placeholder="Digite o nome ou a turma" value="${esc(studentSearch)}"></label><label>Organizar por<select id="student-order"><option value="alpha" ${studentOrder==='alpha'?'selected':''}>Ordem alfabética (A–Z)</option><option value="registration" ${studentOrder==='registration'?'selected':''}>Ordem de cadastro</option></select></label></div><p id="student-results" role="status"></p><small>Para alunos importados, a ordem de cadastro segue a ordem das linhas da planilha.</small><div class="scroll"><table><thead><tr><th>Aluno</th><th>Histórico autorizado</th><th>Novas horas autorizadas</th><th>Total autorizado</th><th>Pendentes para 400h</th><th>Ações</th></tr></thead><tbody id="student-rows"></tbody></table></div></div><h2>Oportunidades cadastradas</h2><div class="card scroll"><table><thead><tr><th>Aluno</th><th>Campo</th><th>Período</th><th>Previsão</th><th>Ficha</th></tr></thead><tbody id="student-op-rows"></tbody></table></div>`;
  updateStudentRows();if(focused){$('student-search').focus();$('student-search').setSelectionRange(cursor,cursor);}
}
function updateStudentRows(){
  const visible=Domain.orderedStudents(students,studentSearch,studentOrder),positions=new Map(visible.map((s,i)=>[s.id,i]));
  $('student-results').textContent=`${visible.length} de ${students.length} alunos`;
  $('student-rows').innerHTML=visible.map(s=>{const h=Domain.totalHours(approvals,s);return `<tr><td>${esc(s.nome)}<small><br>${esc(s.turma)}</small></td><td>${hoursText(Domain.historicalHours(s))}</td><td>${hoursText(Domain.approvedHours(approvals,s.id))}</td><td>${hoursText(h)}</td><td>${Math.max(0,400-h)}h</td><td>${button('Histórico','history',s.id)}</td></tr>`;}).join('')||'<tr><td colspan="6" class="empty">Nenhum aluno encontrado.</td></tr>';
  const ops=opportunities.filter(o=>positions.has(o.studentId)).sort((a,b)=>positions.get(a.studentId)-positions.get(b.studentId));
  $('student-op-rows').innerHTML=opRows(ops)||'<tr><td colspan="5" class="empty">Nenhuma oportunidade para os alunos exibidos.</td></tr>';
}
function renderExternal(){
  const historical=students.filter(s=>(s.historico||[]).some(h=>!['IOT','SESI','UPA','MEDSAUDE'].includes(h.local.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase())));
  $('content').innerHTML=`<p>Acompanhamento de estágios em instituições não parceiras, com período, frequência e autorização separados.</p>${button('Cadastrar estágio externo','op','EXTERNO','primary')}<div class="card scroll" style="margin-top:20px"><table><thead><tr><th>Aluno</th><th>Instituição</th><th>Período</th><th>Previsão</th><th>Ficha</th></tr></thead><tbody>${opRows(opportunities.filter(o=>o.group==='EXTERNO'))}</tbody></table></div><h2>Histórico externo nas planilhas</h2><div class="card">${historical.map(s=>`<p>${esc(s.nome)} ${button('Consultar','history',s.id)}</p>`).join('')}</div><h2>Registrar frequência externa</h2><form id="external-attendance" class="card"><label>Oportunidade<select name="opportunityId" required><option value="">Selecione</option>${opportunities.filter(o=>o.group==='EXTERNO').map(o=>`<option value="${o.id}">${esc(o.studentName)} · ${esc(o.local)} · ${fmt(o.start)} a ${fmt(o.end)}</option>`).join('')}</select></label><label>Data<input name="date" type="date" max="${Domain.today()}" required></label><label>Situação<select name="status"><option value="presente">Presente</option><option value="falta">Falta</option></select></label><button>Salvar frequência</button></form>`;
}
function renderApprovals(){
  $('content').innerHTML='<p>As horas só são validadas após o último dia da oportunidade, mediante autorização individual de Yuri ou Luiz. A autorização encerra os lançamentos do período.</p>'+opportunities.map(o=>{
    const approval=approvals.find(a=>a.id===o.id), records=attendance.filter(a=>a.opportunityId===o.id), present=records.filter(a=>a.status==='presente'), missing=o.dates.length-records.length;
    return `<article class="card"><h3>${esc(o.studentName)} · ${esc(o.local||o.fieldName)}</h3><p>${fmt(o.start)} a ${fmt(o.end)} · ${present.length} presenças · ${missing} dias sem registro</p>${approval?`<p class="good">${approval.hours}h autorizadas por ${esc(approval.approvedName)}</p>`:o.end>=Domain.today()?'<p>Período ainda não encerrado.</p>':`${button('Revisar e autorizar '+present.length*o.hours+'h','approve',o.id,'primary')}`}</article>`;
  }).join('');
}
function renderWaitlist(){const list=settings.waitlist?.items||[];$('content').innerHTML=`<div class="card"><p>Dados preservados da planilha. Preferências ambíguas permanecem como na origem.</p><table><thead><tr><th>Nome</th><th>Turma</th><th>Disponibilidade</th><th>Campo / grupo</th></tr></thead><tbody>${list.map(s=>`<tr><td>${esc(s.nome)}</td><td>${esc(s.turma)}</td><td>${esc(s.disponibilidade)}</td><td>${esc(s.campo)||'—'}</td></tr>`).join('')}</tbody></table></div>`;}
function renderSetup(){
  $('content').innerHTML=`<article class="card"><h2>Quadro conferido com as planilhas</h2><p>Selecione o arquivo <strong>importacao-planilhas.json</strong> entregue na pasta private. A importação cria somente registros ausentes; não substitui dados já cadastrados.</p><p>MEDSAUDE não será criado como campo. O histórico de CONTROLE DE HORAS foi autorizado por Yuri e Luiz. Novas oportunidades continuam exigindo encerramento e aprovação.</p><form id="import-form"><input type="file" name="file" accept="application/json,.json" required><button>Importar dados conferidos</button></form></article><article class="card"><h3>Dados anteriores do Firebase</h3><p>O documento antigo permanece preservado. Exporte uma cópia para conferir registros anteriores antes de migrar oportunidades.</p>${button('Baixar cópia do banco anterior','legacy')}</article>`;
}
function opModal(fieldId='',slotId=''){
  mustAdmin();const f=fields.find(f=>f.id===fieldId), slot=f?.slots.find(s=>s.id===slotId);
  modal(`<h2>Cadastrar oportunidade</h2><p>O período e os dias definidos aqui serão usados na chamada e em todas as páginas da ficha. Cadastrar não credita horas.</p>${slot?.aluno?`<p>Nome na planilha: <strong>${esc(slot.aluno)}</strong>. Selecione o cadastro correspondente; nomes abreviados não são vinculados automaticamente.</p>`:''}<form id="op-form"><input type="hidden" name="slotId" value="${esc(slotId)}"><label>Aluno<select name="studentId" required><option value="">Selecione o aluno</option>${students.map(s=>`<option value="${s.id}">${esc(s.nome)}</option>`).join('')}</select></label><label>Campo<select name="fieldId" ${slotId?'disabled':''}>${fields.map(f=>`<option value="${f.id}" ${fieldId===f.id?'selected':''}>${esc(f.nome)}</option>`).join('')}<option value="EXTERNO" ${fieldId==='EXTERNO'?'selected':''}>Externo</option></select></label>${slotId?`<input name="fieldId" type="hidden" value="${esc(fieldId)}">`:''}<div class="form-grid"><label>Instituição externa (quando aplicável)<input name="local"></label><label>Turma<input name="turma"></label><label>Início<input name="start" type="date" value="${slot?.inicio||''}" required></label><label>Término<input name="end" type="date" value="${slot?.fim||''}" required></label><label>Horas por dia de estágio<input name="hours" type="number" min="0.25" max="24" step="0.25" required></label><label>Preceptor<input name="preceptor" value="${esc(f?.preceptor||'')}" required></label></div><label>Dias de estágio</label><div class="days">${Domain.days.map((d,i)=>`<label><input type="checkbox" name="days" value="${i}" ${slot?.dias.includes(i)?'checked':''}>${d}</label>`).join('')}</div><label>Observações / próximo aluno<textarea name="notes"></textarea></label><button>Salvar oportunidade e preparar ficha</button></form>`);
}
async function saveOp(form){
  mustAdmin();const data=new FormData(form), f=fields.find(f=>f.id===data.get('fieldId')), student=students.find(s=>s.id===data.get('studentId'));
  const external=data.get('fieldId')==='EXTERNO';if(!student||(!external&&!f))throw Error('Selecione aluno e campo válidos.');
  const start=data.get('start'),end=data.get('end'),days=data.getAll('days').map(Number),hours=Number(data.get('hours')),dates=Domain.datesBetween(start,end,days);
  if(!(hours>0&&hours<=24))throw Error('Informe as horas por dia.');if(external&&!data.get('local').trim())throw Error('Informe a instituição externa.');
  const ref=db.collection('opportunities').doc(), slotId=data.get('slotId');
  const op={studentId:student.id,studentName:student.nome,turma:data.get('turma').trim()||student.turma||'',fieldId:external?'EXTERNO':f.id,fieldName:external?'Externo':f.nome,group:external?'EXTERNO':f.group,local:external?data.get('local').trim():'',preceptor:data.get('preceptor').trim(),start,end,days,hours,dates,dateTimes:Object.fromEntries(dates.map(d=>[d,firebase.firestore.Timestamp.fromDate(new Date(d+'T00:00:00-03:00'))])),endAt:firebase.firestore.Timestamp.fromDate(new Date(end+'T23:59:59.999-03:00')),notes:data.get('notes'),createdBy:auth.currentUser.uid,createdAt:stamp()};
  await db.runTransaction(async tx=>{
    let fieldDoc;if(!external)fieldDoc=await tx.get(db.collection('fields').doc(f.id));
    if(fieldDoc){
      const current=fieldDoc.data(), slots=structuredClone(current.slots), candidates=[];
      for(const day of days){
        const matches=slots.filter(s=>!s.bloqueada&&s.dias.includes(day));
        let selected=slotId?matches.find(s=>s.id===slotId):matches.find(s=>!s.aluno);
        if(!selected)throw Error('Sem vaga livre para '+Domain.days[day]+'. Selecione a vaga existente no quadro para cadastrar seu período.');
        if(selected.dias.some(d=>!days.includes(d)))throw Error('Selecione todos os dias do grupo desta vaga, conforme a planilha.');
        if(selected.opportunityId)throw Error('Esta vaga já possui oportunidade. Libere-a após o encerramento antes de cadastrar outra.');
        if(!candidates.includes(selected))candidates.push(selected);
      }
      candidates.forEach(s=>{s.aluno=student.nome;s.studentId=student.id;s.inicio=start;s.fim=end;s.opportunityId=ref.id;s.obs=op.notes||s.obs;});
      tx.update(fieldDoc.ref,{slots});
    }
    tx.set(ref,op);
  });
  modal(`<h2>Oportunidade salva</h2><p>${esc(student.nome)} · ${fmt(start)} a ${fmt(end)} · ${dates.length} dias de estágio.</p><p>Horas autorizadas: 0h. A ficha está pronta para download.</p>${button('Baixar ficha de frequência','pdf',ref.id,'primary')}`);notify('Oportunidade salva no Firebase. Nenhuma hora foi creditada.');
}
async function saveAttendance(entries){
  if(!entries.length)throw Error('Nenhum registro selecionado.');
  const batch=db.batch();for(const {op,date,status} of entries){
    if(!op||!accessible(op.group)||!op.dates.includes(date)||date>Domain.today()||!['presente','falta'].includes(status))throw Error('Registro fora do campo, período ou dias permitidos.');
    batch.set(db.collection('attendance').doc(Domain.attendanceId(op.id,date)),{opportunityId:op.id,group:op.group,date,dateAt:op.dateTimes[date],status,recordedBy:auth.currentUser.uid,updatedAt:stamp()});
  }await batch.commit();entries.forEach(({op,date})=>drafts.delete(Domain.attendanceId(op.id,date)));notify('Frequência salva. As horas aguardam encerramento e autorização.');
}
async function approve(id){
  mustAdmin();const op=opportunities.find(o=>o.id===id);if(!op||op.end>=Domain.today())throw Error('O período precisa estar encerrado.');
  const records=attendance.filter(a=>a.opportunityId===id), missing=op.dates.filter(d=>!records.some(a=>a.date===d));
  modal(`<h2>Autorizar horas</h2><p>${esc(op.studentName)} · ${fmt(op.start)} a ${fmt(op.end)}</p><p class="warning">${missing.length} dias sem registro. Somente presenças registradas serão contabilizadas.</p><p>A autorização é registrada em seu nome e encerra os lançamentos deste período.</p>${button('Confirmar autorização das presenças','confirm-approval',id,'primary')}`);
}
async function commitApproval(id){
  mustAdmin();const op=opportunities.find(o=>o.id===id);if(!op||op.end>=Domain.today())throw Error('Período ainda não encerrado.');
  await db.runTransaction(async tx=>{
    const ref=db.collection('approvals').doc(id), existing=await tx.get(ref);if(existing.exists)throw Error('Este período já foi autorizado.');
    const snapshots=await Promise.all(op.dates.map(d=>tx.get(db.collection('attendance').doc(Domain.attendanceId(id,d)))));
    const presentDates=snapshots.filter(s=>s.exists&&s.data().status==='presente').map(s=>s.data().date);
    tx.set(ref,{studentId:op.studentId,group:op.group,hours:presentDates.length*op.hours,presentDates,approvedBy:auth.currentUser.uid,approvedName:profile.name,approvedAt:stamp()});
  });$('dialog').close();notify('Horas autorizadas e período encerrado.');
}
async function importData(form){
  mustAdmin();const file=new FormData(form).get('file'), payload=JSON.parse(await file.text());
  if(payload.version!==2||payload.students.length!==89||payload.fields.some(f=>!['IOT','SESI','UPA'].includes(f.group)))throw Error('Selecione o arquivo de importação conferido.');
  await db.runTransaction(async tx=>{
    const marker=db.collection('settings').doc('import-v2');if((await tx.get(marker)).exists)throw Error('Estas planilhas já foram importadas. O quadro atual será preservado.');
    const entries=[...payload.fields.map(f=>[db.collection('fields').doc(f.id),f]),...payload.students.map(s=>[db.collection('students').doc(s.id),s]),[db.collection('settings').doc('waitlist'),{items:payload.waitlist}]];
    const snapshots=await Promise.all(entries.map(([r])=>tx.get(r)));
    entries.forEach(([ref,value],i)=>{if(!snapshots[i].exists)tx.set(ref,value);});
    tx.set(marker,{createdBy:auth.currentUser.uid,createdAt:stamp(),source:'Planilha de Estágio - Radiologia.xlsx e CONTROLE DE HORAS.xlsx'});
  });notify('Planilhas importadas. Datas ausentes permanecem pendentes de cadastro.');view='fields';render();
}
async function editField(id,slotId,kind){
  mustAdmin();const f=fields.find(f=>f.id===id),slot=f.slots.find(s=>s.id===slotId);
  if(kind==='release'){
    if(slot.fim&&slot.fim>=Domain.today())throw Error('O período ainda não terminou. A vaga não pode ser liberada enquanto o aluno está em estágio.');
    modal(`<h2>Liberar vaga</h2><p>${esc(slot.aluno)} · ${esc(f.nome)}. O histórico de oportunidades e frequências será preservado.</p>${button('Confirmar liberação','confirm-release',id+'|'+slotId,'danger')}`);return;
  }
  modal(`<h2>Observações</h2><form id="note-form"><input type="hidden" name="fieldId" value="${id}"><input type="hidden" name="slotId" value="${slotId||''}"><label>Próximo aluno, previsão de início e outras informações<textarea name="text">${esc(slot?slot.obs:f.observacoes)}</textarea></label><button>Salvar observações</button></form>`);
}
document.addEventListener('click',async e=>{
  const target=e.target.closest('button');if(!target)return;
  if(target.dataset.view){view=target.dataset.view;render();return;}
  const action=target.dataset.action,id=target.dataset.id;if(!action)return;
  try{
    if(action==='password')modal('<h2>Alterar minha senha</h2><form id="password-form"><label>Senha atual<input name="current" type="password" autocomplete="current-password" required></label><label>Nova senha (mínimo 12 caracteres)<input name="next" type="password" minlength="12" autocomplete="new-password" required></label><label>Repita a nova senha<input name="confirm" type="password" minlength="12" autocomplete="new-password" required></label><button>Alterar senha</button></form>');
    else if(action==='tce')tceModal(id);
    else if(action==='op')opModal(id);
    else if(action==='slot'){const [f,s]=id.split('|');opModal(f,s);}
    else if(action==='pdf'){const op=opportunities.find(o=>o.id===id);if(!op||!accessible(op.group))throw Error('Oportunidade indisponível.');await downloadFicha(op);}
    else if(action==='approve')await approve(id);
    else if(action==='confirm-approval')await commitApproval(id);
    else if(['slot-note','field-note','release'].includes(action)){const [f,s]=id.split('|');await editField(f,s,action);}
    else if(action==='confirm-release'){
      mustAdmin();const [f,s]=id.split('|');await db.runTransaction(async tx=>{const ref=db.collection('fields').doc(f),doc=await tx.get(ref),slots=doc.data().slots,slot=slots.find(x=>x.id===s);if(slot.fim&&slot.fim>=Domain.today())throw Error('Período em andamento.');Object.assign(slot,{aluno:'',inicio:'',fim:''});delete slot.studentId;delete slot.opportunityId;tx.update(ref,{slots});});$('dialog').close();notify('Vaga liberada.');
    }
    else if(action==='student'){mustAdmin();modal('<h2>Cadastrar aluno</h2><form id="student-form"><label>Nome completo<input name="nome" required></label><label>Turma<input name="turma" required></label><button>Salvar aluno</button></form>');}
    else if(action==='history'){
      mustAdmin();const s=students.find(s=>s.id===id);modal(`<h2>${esc(s.nome)}</h2><p>${esc(s.fonte||'Cadastro manual')}</p><p>Histórico da planilha CONTROLE DE HORAS, autorizado por Yuri e Luiz. O total da planilha é contabilizado uma única vez, sem somar novamente cada linha do histórico.</p><table><tr><th>Local</th><th>Período</th><th>Horas</th></tr>${(s.historico||[]).map(h=>`<tr><td>${esc(h.local)}</td><td>${esc(h.periodo)}</td><td>${h.horas}</td></tr>`).join('')}</table>`);
    }
    else if(action==='new-slot'){mustAdmin();modal(`<h2>Vaga da UPA Manhã</h2><p>A quantidade não consta na planilha. Cadastre apenas uma vaga confirmada.</p><form id="new-slot-form"><label>Número da vaga<input type="number" name="number" min="1" required></label><div class="days">${Domain.days.map((d,i)=>`<label><input type="checkbox" name="days" value="${i}">${d}</label>`).join('')}</div><button>Cadastrar vaga</button></form>`);}
    else if(action==='legacy'){
      mustAdmin();const doc=await db.collection('radcontrol').doc('estado_principal').get();if(!doc.exists)throw Error('Não há documento anterior neste banco.');const url=URL.createObjectURL(new Blob([JSON.stringify(doc.data(),null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='backup-banco-anterior.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
    }
  }catch(err){failure(err);}
});
document.addEventListener('input',e=>{if(e.target.id==='student-search'){studentSearch=e.target.value;updateStudentRows();}});
document.addEventListener('change',e=>{
  if(e.target.id==='student-order'){studentOrder=e.target.value;updateStudentRows();}
  if(e.target.closest('#attendance-form'))drafts.set(Domain.attendanceId(e.target.name,selectedDate),e.target.value);
  if(e.target.id==='att-field'){selectedField=e.target.value;renderAttendance();restoreDrafts();}
  if(e.target.id==='att-date'){selectedDate=e.target.value;renderAttendance();restoreDrafts();}
  if(e.target.closest('#op-form')&&e.target.name==='fieldId'){const f=fields.find(f=>f.id===e.target.value);e.target.form.elements.preceptor.value=f?.preceptor||'';}
  if(e.target.closest('#op-form')&&e.target.name==='studentId'){const s=students.find(s=>s.id===e.target.value);e.target.form.elements.turma.value=s?.turma||'';}
});
document.addEventListener('submit',async e=>{
  const form=e.target;if(form.id==='login-form')return;e.preventDefault();const submit=form.querySelector('button');if(submit)submit.disabled=true;
  try{
    if(form.id==='password-form'){
      const f=new FormData(form);if(f.get('next')!==f.get('confirm'))throw Error('As novas senhas não coincidem.');if(f.get('next').length<12)throw Error('Use pelo menos 12 caracteres.');
      const credential=firebase.auth.EmailAuthProvider.credential(auth.currentUser.email,f.get('current'));await auth.currentUser.reauthenticateWithCredential(credential);await auth.currentUser.updatePassword(f.get('next'));form.reset();$('dialog').close();notify('Senha alterada.');
    }
    else if(form.id==='tce-form'){
      mustAdmin();const f=new FormData(form),start=f.get('start'),end=f.get('end');Domain.datesBetween(start,end,[0,1,2,3,4,5,6]);
      const id=f.get('id'),ref=id?db.collection('settings').doc(id):db.collection('settings').doc();
      if(id&&settings[id]?.type!=='tce')throw Error('TCE indisponível.');
      const value={type:'tce',studentName:f.get('studentName').trim(),number:f.get('number').trim(),fieldName:f.get('fieldName').trim(),start,end,updatedBy:profile.name,updatedAt:stamp()};
      if(!value.studentName||!value.fieldName)throw Error('Informe aluno e campo.');
      await ref.set(value,{merge:true});$('dialog').close();notify('TCE salvo. Dashboard atualizado.');
    }
    else if(form.id==='op-form')await saveOp(form);
    else if(form.id==='attendance-form')await saveAttendance([...new FormData(form)].map(([id,status])=>({op:opportunities.find(o=>o.id===id),date:selectedDate,status})));
    else if(form.id==='external-attendance'){mustAdmin();const f=new FormData(form);await saveAttendance([{op:opportunities.find(o=>o.id===f.get('opportunityId')),date:f.get('date'),status:f.get('status')}]);}
    else if(form.id==='import-form')await importData(form);
    else if(form.id==='student-form'){mustAdmin();const f=new FormData(form);if(!f.get('nome').trim())throw Error('Informe o nome.');await db.collection('students').add({nome:f.get('nome').trim(),turma:f.get('turma').trim(),historico:[],horasPlanilha:null,createdAt:stamp()});$('dialog').close();notify('Aluno salvo no Firebase.');}
    else if(form.id==='note-form'){
      mustAdmin();const f=new FormData(form),ref=db.collection('fields').doc(f.get('fieldId'));await db.runTransaction(async tx=>{const d=await tx.get(ref);if(f.get('slotId')){const slots=d.data().slots;slots.find(s=>s.id===f.get('slotId')).obs=f.get('text');tx.update(ref,{slots});}else tx.update(ref,{observacoes:f.get('text')});});$('dialog').close();notify('Observação salva.');
    }
    else if(form.id==='new-slot-form'){
      mustAdmin();const f=new FormData(form),number=Number(f.get('number')),days=f.getAll('days').map(Number);if(!days.length)throw Error('Selecione os dias.');await db.runTransaction(async tx=>{const ref=db.collection('fields').doc('UPA-MANHA'),d=await tx.get(ref),slots=d.data().slots;for(const day of days){const id=number+'-'+day;if(slots.some(s=>s.id===id))throw Error('Vaga já cadastrada neste dia.');slots.push({id,vaga:number,dias:[day],aluno:'',inicio:'',fim:'',bloqueada:false,obs:''});}tx.update(ref,{slots});});$('dialog').close();notify('Vaga cadastrada.');
    }
  }catch(err){failure(err);}finally{if(submit)submit.disabled=false;}
});

