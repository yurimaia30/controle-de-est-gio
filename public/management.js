'use strict';
let studentBase='active';
const studentCompleted=student=>Domain.totalHours(approvals,student)>=400;
function studentActivityYears(student){
  const years=[];
  opportunities.filter(op=>op.studentId===student.id).forEach(op=>{if(/^\d{4}-\d{2}-\d{2}$/.test(op.end||''))years.push(Number(op.end.slice(0,4)));});
  (student.historico||[]).forEach(item=>{const found=String(item.periodo||'').match(/\b20\d{2}\b/g)||[];found.forEach(year=>years.push(Number(year)));});
  Object.values(student.horasAntigas||{}).forEach(item=>{if(/^\d{4}-\d{2}-\d{2}$/.test(item.end||''))years.push(Number(item.end.slice(0,4)));});
  return years;
}
function oldCompletedStudent(student){
  if(!studentCompleted(student))return false;
  const years=studentActivityYears(student);if(!years.length||Math.max(...years)>2024)return false;
  const assigned=fields.flatMap(field=>field.slots||[]).filter(slot=>slot.studentId===student.id);
  return !assigned.some(slot=>!(/^\d{4}-\d{2}-\d{2}$/.test(slot.fim||''))||slot.fim>='2025-01-01');
}
const originalRenderStudents=renderStudents;
renderStudents=function(){
  originalRenderStudents();
  const active=students.filter(student=>!studentCompleted(student)).length,completed=students.length-active,old=students.filter(oldCompletedStudent).length;
  const toolbar=$('content').querySelector('.row.toolbar');
  if(toolbar)toolbar.insertAdjacentHTML('beforeend',button('Em andamento ('+active+')','student-base-active','',''+(studentBase==='active'?'primary':'secondary'))+button('Concluídos · 400h ('+completed+')','student-base-completed','',''+(studentBase==='completed'?'primary':'secondary'))+(studentBase==='completed'&&old?button('Excluir '+old+' concluído(s) até 2024','cleanup-old-completed','','danger'):''));
};
updateStudentRows=function(){
  mustAdmin();
  const ordered=Domain.orderedStudents(students,studentSearch,studentOrder),visible=ordered.filter(student=>studentBase==='completed'?studentCompleted(student):!studentCompleted(student)),positions=new Map(visible.map((student,index)=>[student.id,index]));
  $('student-results').textContent=(studentBase==='completed'?'Concluídos com 400h ou mais: ':'Em andamento: ')+visible.length+' de '+students.length+' alunos';
  $('student-rows').innerHTML=visible.map(student=>{const hours=Domain.totalHours(approvals,student),tag=studentCompleted(student)?'<br><span class="badge">Concluído · 400h</span>':'';return '<tr><td>'+esc(student.nome)+'<small><br>'+esc(student.turma)+'</small>'+tag+'</td><td>'+hoursText(Domain.historicalHours(student))+'</td><td>'+hoursText(Domain.approvedHours(approvals,student.id))+'</td><td>'+hoursText(hours)+'</td><td>'+Math.max(0,400-hours)+'h</td><td>'+button('Histórico','history',student.id)+button('Lançar horas antigas','old-hours',student.id)+button('Excluir aluno','delete-student',student.id,'danger')+'</td></tr>';}).join('')||'<tr><td colspan="6" class="empty">Nenhum aluno nesta base.</td></tr>';
  const ops=opportunities.filter(op=>positions.has(op.studentId)).sort((a,b)=>positions.get(a.studentId)-positions.get(b.studentId));
  $('student-op-rows').innerHTML=opRows(ops)||'<tr><td colspan="5" class="empty">Nenhuma oportunidade para os alunos exibidos.</td></tr>';
};
function renderWaitlist(){
  mustAdmin();const list=settings.waitlist?.items||[];
  $('content').innerHTML=`<p>Adicionar ou retirar da espera não altera o cadastro nem as horas do aluno.</p>${button('Adicionar à lista de espera','wait-edit','','primary')}<div class="card scroll"><table><thead><tr><th>Nome</th><th>Turma</th><th>Disponibilidade</th><th>Campo / grupo</th><th>Ações</th></tr></thead><tbody>${list.map((s,i)=>`<tr><td>${esc(s.nome)}</td><td>${esc(s.turma)}</td><td>${esc(s.disponibilidade)}</td><td>${esc(s.campo)||'—'}</td><td>${button('Editar','wait-edit',i)}${button('Retirar','wait-remove',i,'danger')}</td></tr>`).join('')||'<tr><td colspan="5">Nenhum aluno na lista de espera.</td></tr>'}</tbody></table></div>`;
}
const waitFingerprint=item=>['nome','turma','disponibilidade','campo'].map(key=>String(item?.[key]??'')).join('\u001f');
let waitOriginal=null;
const tceBefore2025=tce=>[tce.start,tce.end].some(date=>/^\d{4}-\d{2}-\d{2}$/.test(date||'')&&date<'2025-01-01');
const originalRenderTces=renderTces;
renderTces=function(){
  mustAdmin();const old=tces().filter(tceBefore2025);
  const controls=button('Cadastrar TCE','tce','','primary')+(old.length?button('Excluir '+old.length+' TCE(s) anteriores a 2025','purge-old-tces','','danger'):'');
  const note=old.length?'<p class="warning">'+old.length+' registro(s) têm início ou término anterior a 01/01/2025 e podem ser excluídos.</p>':'';
  $('content').innerHTML='<p>TCEs recuperados do cadastro anterior e novos registros da coordenação. Editar a vigência do TCE não altera as datas das oportunidades nem autoriza horas.</p><div class="toolbar">'+controls+'</div>'+note+tceTable(tces().sort((a,b)=>(a.end||'9999').localeCompare(b.end||'9999')));
};
function purgeOldTcesModal(){
  mustAdmin();const old=tces().filter(tceBefore2025);if(!old.length)throw Error('Não há TCEs anteriores a 2025 para excluir.');
  const rows=old.map(t=>'<tr><td>'+esc(t.studentName)+'</td><td>'+(esc(t.number)||'—')+'</td><td>'+fmt(t.start)+' a '+fmt(t.end)+'</td></tr>').join('');
  modal('<h2>Excluir TCEs anteriores a 2025</h2><p>Serão excluídos <strong>'+old.length+' TCE(s)</strong> cujo início ou término é anterior a 01/01/2025.</p><div class="card scroll"><table><thead><tr><th>Aluno</th><th>TCE</th><th>Vigência</th></tr></thead><tbody>'+rows+'</tbody></table></div><p>O procedimento remove somente os registros do menu Controle de TCEs. Oportunidades, frequências e horas não serão alteradas.</p><form id="purge-old-tces-form"><label>Digite EXCLUIR 2024 para confirmar<input name="confirmation" required pattern="EXCLUIR 2024" autocomplete="off"></label><button class="danger">Excluir '+old.length+' TCE(s)</button></form>');
}
async function purgeOldTces(form){
  mustAdmin();if(new FormData(form).get('confirmation')!=='EXCLUIR 2024')throw Error('Digite EXCLUIR 2024.');
  const candidates=tces().filter(tceBefore2025),refs=candidates.map(t=>db.collection('settings').doc(t.id));
  if(!refs.length)throw Error('Não há TCEs anteriores a 2025 para excluir.');
  const docs=await Promise.all(refs.map(ref=>ref.get())),batch=db.batch();
  let removed=0;docs.forEach(doc=>{const data=doc.data();if(doc.exists&&data?.type==='tce'&&tceBefore2025(data)){batch.delete(doc.ref);removed++;}});
  if(!removed)throw Error('Os TCEs selecionados foram alterados. Atualize a tela e tente novamente.');
  await batch.commit();return removed;
}
function waitModal(id,remove=false){
  mustAdmin();const item=id===''?null:settings.waitlist?.items?.[Number(id)];
  if(id!==''&&!item)throw Error('Registro indisponível. Atualize a lista.');
  waitOriginal=item?waitFingerprint(item):null;
  modal(`<h2>${remove?'Retirar da lista de espera':item?'Editar espera':'Adicionar à lista de espera'}</h2><form id="wait-form"><input type="hidden" name="index" value="${esc(id)}"><input type="hidden" name="remove" value="${remove?'yes':'no'}">${remove?`<p>Retirar <strong>${esc(item.nome)}</strong> da espera? O cadastro e o histórico serão mantidos.</p>`:`<label>Nome completo<input name="nome" value="${esc(item?.nome)}" required></label><label>Turma<input name="turma" value="${esc(item?.turma)}" required></label><label>Disponibilidade<input name="disponibilidade" value="${esc(item?.disponibilidade)}" required></label><label>Campo / grupo<input name="campo" value="${esc(item?.campo)}" placeholder="Ex.: IOT, SESI ou UPA-G1"></label>`}<button>${remove?'Confirmar retirada':'Salvar'}</button></form>`);
}
function oldHoursModal(id){
  mustAdmin();const s=students.find(x=>x.id===id);if(!s)throw Error('Aluno indisponível.');
  const entries=Object.values(s.horasAntigas||{});
  modal(`<h2>Horas antigas · ${esc(s.nome)}</h2><p>Lance somente horas que ainda não estão no saldo. Este lançamento será autorizado por ${esc(profile.name)} e não altera TCEs ou frequências.</p><p>Saldo atual: ${hoursText(Domain.totalHours(approvals,s))}</p><form id="old-hours-form"><input type="hidden" name="studentId" value="${esc(id)}"><input type="hidden" name="entryId" value="${crypto.randomUUID()}"><label>Instituição / campo<input name="local" required></label><div class="form-grid"><label>Início do período<input name="start" type="date" max="${Domain.today()}" required></label><label>Fim do período<input name="end" type="date" max="${Domain.today()}" required></label><label>Horas a acrescentar<input name="hours" type="number" min="0.25" step="0.25" required></label></div><label>Referência / justificativa<textarea name="notes" required placeholder="Ex.: ficha antiga conferida, ainda não lançada"></textarea></label><label><input type="checkbox" required> Conferi que estas horas ainda não foram contabilizadas.</label><button>Autorizar e somar horas</button></form><h3>Lançamentos anteriores</h3>${entries.map(h=>`<p>${esc(h.local)} · ${fmt(h.start)} a ${fmt(h.end)} · ${hoursText(h.hours)}<br>${esc(h.notes)}<br>Responsável: ${esc(h.authorName)}</p>`).join('')||'<p>Nenhum lançamento manual.</p>'}`);
}
async function saveOldHours(form){
  mustAdmin();const f=new FormData(form),hours=Number(f.get('hours')),start=f.get('start'),end=f.get('end');
  Domain.datesBetween(start,end,[0,1,2,3,4,5,6]);
  if(end>Domain.today()||!Number.isFinite(hours)||hours<=0||hours*4!==Math.round(hours*4))throw Error('Informe horas positivas em intervalos de 0,25h e um período passado.');
  const local=f.get('local').trim(),notes=f.get('notes').trim();if(!local||!notes)throw Error('Informe instituição e justificativa.');
  const entry={local,notes,start,end,hours,authorName:profile.name,authorUid:auth.currentUser.uid,recordedAt:new Date().toISOString()};
  const ref=db.collection('students').doc(f.get('studentId')),key=f.get('entryId');
  await db.runTransaction(async tx=>{const doc=await tx.get(ref);if(!doc.exists)throw Error('Aluno excluído ou indisponível.');const entries=doc.data().horasAntigas||{};if(entries[key])return;tx.update(ref,{horasAntigas:{...entries,[key]:entry},updatedAt:stamp()});});
}
function deleteStudentModal(id){
  mustAdmin();const s=students.find(x=>x.id===id);if(!s)throw Error('Aluno indisponível.');
  modal(`<h2>Excluir aluno da base ativa</h2><p>Excluir <strong>${esc(s.nome)}</strong> de Controle de horas? O aluno deixará de compor os totais do dashboard. Frequências, oportunidades e autorizações existentes não serão apagadas; uma cópia administrativa do cadastro será preservada.</p><p>Libere antes as vagas vinculadas ao aluno. Registros antigos sem vínculo devem ser conferidos manualmente no quadro e na lista de espera.</p><form id="delete-student-form"><input type="hidden" name="studentId" value="${esc(id)}"><label>Digite EXCLUIR para confirmar<input name="confirmation" required pattern="EXCLUIR" autocomplete="off"></label><button class="danger">Excluir aluno</button></form>`);
}
async function deleteStudent(form){
  mustAdmin();const f=new FormData(form),id=f.get('studentId');if(f.get('confirmation')!=='EXCLUIR')throw Error('Digite EXCLUIR.');
  const ref=db.collection('students').doc(id),backup=db.collection('settings').doc('deleted-student-'+id);
  await db.runTransaction(async tx=>{
    const doc=await tx.get(ref);if(!doc.exists)throw Error('Aluno já excluído.');
    const fieldDocs=await Promise.all(fields.map(field=>tx.get(db.collection('fields').doc(field.id))));
    if(fieldDocs.some(d=>(d.data()?.slots||[]).some(s=>s.studentId===id)))throw Error('Libere as vagas vinculadas ao aluno em Campos e vagas antes de excluir.');
    tx.set(backup,{type:'deleted-student',studentId:id,student:doc.data(),deletedBy:profile.name,deletedUid:auth.currentUser.uid,deletedAt:stamp()});tx.delete(ref);
  });
}
function cleanupOldCompletedModal(){
  mustAdmin();const old=students.filter(oldCompletedStudent);if(!old.length)throw Error('Não há alunos concluídos até 2024 aptos para exclusão.');
  const rows=old.map(student=>'<tr><td>'+esc(student.nome)+'</td><td>'+esc(student.turma)+'</td><td>'+hoursText(Domain.totalHours(approvals,student))+'</td><td>'+Math.max(...studentActivityYears(student))+'</td></tr>').join('');
  modal('<h2>Excluir concluídos até 2024</h2><p>Serão excluídos <strong>'+old.length+' aluno(s)</strong> com 400h ou mais, sem estágio ativo e com último período registrado em 2024 ou antes.</p><div class="card scroll"><table><thead><tr><th>Aluno</th><th>Turma</th><th>Horas</th><th>Último ano</th></tr></thead><tbody>'+rows+'</tbody></table></div><p>Uma cópia administrativa do cadastro será preservada. Oportunidades, frequências e autorizações antigas não serão apagadas.</p><form id="cleanup-old-completed-form"><label>Digite EXCLUIR ANTIGOS para confirmar<input name="confirmation" required pattern="EXCLUIR ANTIGOS" autocomplete="off"></label><button class="danger">Excluir '+old.length+' aluno(s)</button></form>');
}
async function cleanupOldCompleted(form){
  mustAdmin();if(new FormData(form).get('confirmation')!=='EXCLUIR ANTIGOS')throw Error('Digite EXCLUIR ANTIGOS.');
  const candidates=students.filter(oldCompletedStudent);if(!candidates.length)throw Error('Não há alunos concluídos até 2024 aptos para exclusão.');
  const candidateIds=new Set(candidates.map(student=>student.id)),batch=db.batch();
  fields.forEach(field=>{const slots=(field.slots||[]).map(slot=>{if(!candidateIds.has(slot.studentId))return slot;const next=Object.assign({},slot,{aluno:'',inicio:'',fim:''});delete next.studentId;delete next.opportunityId;return next;});if(JSON.stringify(slots)!==JSON.stringify(field.slots||[]))batch.update(db.collection('fields').doc(field.id),{slots});});
  candidates.forEach(student=>{const ref=db.collection('students').doc(student.id),backup=db.collection('settings').doc('deleted-student-'+student.id);batch.set(backup,{type:'deleted-student',studentId:student.id,student,deletedBy:profile.name,deletedUid:auth.currentUser.uid,deletedAt:stamp(),reason:'Concluído com 400h ou mais; último período até 2024'});batch.delete(ref);});
  await batch.commit();return candidates.length;
}
document.addEventListener('click',e=>{
  const b=e.target.closest('button[data-action]');if(!b)return;
  try{const a=b.dataset.action,id=b.dataset.id;
    if(a==='wait-edit'||a==='wait-remove')waitModal(id,a==='wait-remove');
    if(a==='old-hours')oldHoursModal(id);
    if(a==='delete-student')deleteStudentModal(id);
    if(a==='purge-old-tces')purgeOldTcesModal();
    if(a==='student-base-active'){studentBase='active';renderStudents();}
    if(a==='student-base-completed'){studentBase='completed';renderStudents();}
    if(a==='cleanup-old-completed')cleanupOldCompletedModal();
  }catch(err){failure(err);}
});
document.addEventListener('submit',async e=>{
  const form=e.target;if(!['wait-form','old-hours-form','delete-student-form','purge-old-tces-form','cleanup-old-completed-form'].includes(form.id))return;
  e.preventDefault();e.stopImmediatePropagation();const b=form.querySelector('button');if(b.disabled)return;b.disabled=true;
  try{
    mustAdmin();
    if(form.id==='wait-form'){
      const f=new FormData(form),index=f.get('index'),remove=f.get('remove')==='yes',original=waitOriginal;
      const value=remove?null:Object.fromEntries(['nome','turma','disponibilidade','campo'].map(k=>[k,f.get(k).trim()]));
      if(value&&(!value.nome||!value.turma||!value.disponibilidade))throw Error('Preencha nome, turma e disponibilidade.');
      const ref=db.collection('settings').doc('waitlist');
      await db.runTransaction(async tx=>{const d=await tx.get(ref),items=[...(d.data()?.items||[])];
        if(index==='')items.push({...value,id:crypto.randomUUID()});
        else{const i=Number(index);if(waitFingerprint(items[i])!==original)throw Error('A lista mudou em outro acesso. Feche e abra novamente para editar.');if(remove)items.splice(i,1);else items[i]={...items[i],...value};}
        tx.set(ref,{...(d.data()||{}),items,updatedBy:profile.name,updatedAt:stamp()});
      });
    }else if(form.id==='old-hours-form')await saveOldHours(form);
    else if(form.id==='delete-student-form')await deleteStudent(form);
    else if(form.id==='purge-old-tces-form')await purgeOldTces(form);
    else await cleanupOldCompleted(form);
    $('dialog').close();notify('Alteração salva no Firebase.');
  }catch(err){failure(err);}finally{b.disabled=false;}
},true);
