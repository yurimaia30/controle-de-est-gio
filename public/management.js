'use strict';
const oldStudentRows=updateStudentRows;
updateStudentRows=function(){
  mustAdmin();oldStudentRows();
  document.querySelectorAll('#student-rows [data-action="history"]').forEach(b=>{
    b.parentElement.insertAdjacentHTML('beforeend',button('Lançar horas antigas','old-hours',b.dataset.id)+button('Excluir aluno','delete-student',b.dataset.id,'danger'));
  });
};
function renderWaitlist(){
  mustAdmin();const list=settings.waitlist?.items||[];
  $('content').innerHTML=`<p>Adicionar ou retirar da espera não altera o cadastro nem as horas do aluno.</p>${button('Adicionar à lista de espera','wait-edit','','primary')}<div class="card scroll"><table><thead><tr><th>Nome</th><th>Turma</th><th>Disponibilidade</th><th>Campo / grupo</th><th>Ações</th></tr></thead><tbody>${list.map((s,i)=>`<tr><td>${esc(s.nome)}</td><td>${esc(s.turma)}</td><td>${esc(s.disponibilidade)}</td><td>${esc(s.campo)||'—'}</td><td>${button('Editar','wait-edit',i)}${button('Retirar','wait-remove',i,'danger')}</td></tr>`).join('')||'<tr><td colspan="5">Nenhum aluno na lista de espera.</td></tr>'}</tbody></table></div>`;
}
let waitOriginal=null;
function waitModal(id,remove=false){
  mustAdmin();const item=id===''?null:settings.waitlist?.items?.[Number(id)];
  if(id!==''&&!item)throw Error('Registro indisponível. Atualize a lista.');
  waitOriginal=item?JSON.stringify(item):null;
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
document.addEventListener('click',e=>{
  const b=e.target.closest('button[data-action]');if(!b)return;
  try{const a=b.dataset.action,id=b.dataset.id;
    if(a==='wait-edit'||a==='wait-remove')waitModal(id,a==='wait-remove');
    if(a==='old-hours')oldHoursModal(id);
    if(a==='delete-student')deleteStudentModal(id);
  }catch(err){failure(err);}
});
document.addEventListener('submit',async e=>{
  const form=e.target;if(!['wait-form','old-hours-form','delete-student-form'].includes(form.id))return;
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
        else{const i=Number(index);if(JSON.stringify(items[i])!==original)throw Error('A lista mudou em outro acesso. Feche e abra novamente para editar.');if(remove)items.splice(i,1);else items[i]={...items[i],...value};}
        tx.set(ref,{...(d.data()||{}),items,updatedBy:profile.name,updatedAt:stamp()});
      });
    }else if(form.id==='old-hours-form')await saveOldHours(form);
    else await deleteStudent(form);
    $('dialog').close();notify('Alteração salva no Firebase.');
  }catch(err){failure(err);}finally{b.disabled=false;}
},true);
