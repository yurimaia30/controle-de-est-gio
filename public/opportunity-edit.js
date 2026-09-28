'use strict';
function editOpportunityModal(id){
  mustAdmin();const op=opportunities.find(item=>item.id===id);if(!op)throw Error('Oportunidade indisponível.');
  if(approvals.some(item=>item.id===id))throw Error('Esta oportunidade já teve as horas autorizadas e não pode ser alterada.');
  const records=attendance.filter(item=>item.opportunityId===id),scheduleLocked=records.length>0;
  const disabled=scheduleLocked?'disabled':'';
  modal(`<h2>Editar oportunidade</h2><p><strong>${esc(op.studentName)}</strong> · ${esc(op.fieldName)}. Para trocar de aluno ou campo, libere a vaga após o encerramento e cadastre uma nova oportunidade.</p>${scheduleLocked?'<p class="warning">Já existem frequências registradas. Para proteger o histórico, período, dias e horas não podem mais ser alterados; os demais dados continuam editáveis.</p>':'<p>Enquanto não houver frequência registrada, você pode atualizar período, dias, horas, preceptor, turma e observações.</p>'}<form id="edit-op-form"><input type="hidden" name="id" value="${esc(id)}"><div class="form-grid"><label>Turma<input name="turma" value="${esc(op.turma)}" required></label>${op.group==='EXTERNO'?`<label>Instituição externa<input name="local" value="${esc(op.local)}" required></label>`:''}<label>Início<input name="start" type="date" value="${esc(op.start)}" ${disabled} required></label><label>Término<input name="end" type="date" value="${esc(op.end)}" ${disabled} required></label><label>Horas por dia<input name="hours" type="number" min="0.25" max="24" step="0.25" value="${esc(op.hours)}" ${disabled} required></label><label>Preceptor<input name="preceptor" value="${esc(op.preceptor)}" required></label></div><label>Dias de estágio</label><div class="days">${Domain.days.map((day,index)=>`<label><input type="checkbox" name="days" value="${index}" ${op.days.includes(index)?'checked':''} ${disabled}>${day}</label>`).join('')}</div><label>Observações / próximo aluno<textarea name="notes">${esc(op.notes)}</textarea></label><button>Salvar alterações</button></form>`);
}

function clearSlot(slot){
  Object.assign(slot,{aluno:'',inicio:'',fim:''});delete slot.studentId;delete slot.opportunityId;
}

async function saveOpportunityEdit(form){
  mustAdmin();const data=new FormData(form),id=data.get('id'),op=opportunities.find(item=>item.id===id);if(!op)throw Error('Oportunidade indisponível.');
  if(approvals.some(item=>item.id===id))throw Error('As horas deste período já foram autorizadas.');
  const records=attendance.filter(item=>item.opportunityId===id);
  const start=data.get('start')||op.start,end=data.get('end')||op.end,days=data.getAll('days').map(Number),hours=Number(data.get('hours')||op.hours);
  const scheduleChanged=start!==op.start||end!==op.end||hours!==op.hours||days.length!==op.days.length||days.some(day=>!op.days.includes(day));
  if(records.length&&scheduleChanged)throw Error('Já há frequência registrada. Período, dias e horas permanecem bloqueados para preservar o histórico.');
  if(!(hours>0&&hours<=24))throw Error('Informe as horas por dia.');
  const dates=Domain.datesBetween(start,end,days),local=op.group==='EXTERNO'?data.get('local').trim():op.local;
  if(op.group==='EXTERNO'&&!local)throw Error('Informe a instituição externa.');
  const patch={turma:data.get('turma').trim(),preceptor:data.get('preceptor').trim(),local,notes:data.get('notes').trim(),updatedBy:profile.name,updatedAt:stamp()};
  if(!patch.turma||!patch.preceptor)throw Error('Informe turma e preceptor.');
  if(scheduleChanged)Object.assign(patch,{start,end,days,hours,dates,dateTimes:Object.fromEntries(dates.map(date=>[date,firebase.firestore.Timestamp.fromDate(new Date(date+'T00:00:00-03:00'))])),endAt:firebase.firestore.Timestamp.fromDate(new Date(end+'T23:59:59.999-03:00'))});
  await db.runTransaction(async tx=>{
    const opRef=db.collection('opportunities').doc(id),latest=await tx.get(opRef);if(!latest.exists)throw Error('Oportunidade indisponível.');
    const approval=await tx.get(db.collection('approvals').doc(id));if(approval.exists)throw Error('As horas deste período já foram autorizadas.');
    if(op.group!=='EXTERNO'&&scheduleChanged){
      const fieldRef=db.collection('fields').doc(op.fieldId),fieldDoc=await tx.get(fieldRef);if(!fieldDoc.exists)throw Error('Campo indisponível.');
      const slots=structuredClone(fieldDoc.data().slots),previousIds=slots.filter(slot=>slot.opportunityId===id).map(slot=>slot.id),selected=[];
      slots.filter(slot=>slot.opportunityId===id).forEach(clearSlot);
      for(const day of days){
        const matches=slots.filter(slot=>!slot.bloqueada&&slot.dias.includes(day));
        const slot=matches.find(item=>previousIds.includes(item.id))||matches.find(item=>!item.aluno);
        if(!slot)throw Error('Sem vaga livre para '+Domain.days[day]+'.');
        if(slot.dias.some(item=>!days.includes(item)))throw Error('Selecione todos os dias do grupo desta vaga, conforme o quadro.');
        if(!selected.includes(slot))selected.push(slot);
      }
      selected.forEach(slot=>Object.assign(slot,{aluno:op.studentName,studentId:op.studentId,inicio:start,fim:end,opportunityId:id,obs:patch.notes||slot.obs}));
      tx.update(fieldRef,{slots});
    }
    tx.update(opRef,patch);
  });
  $('dialog').close();notify('Oportunidade atualizada no Firebase.');
}

document.addEventListener('click',async event=>{
  const button=event.target.closest('button[data-action="edit-op"]');if(!button)return;
  try{editOpportunityModal(button.dataset.id);}catch(error){failure(error);}
});
document.addEventListener('submit',async event=>{
  const form=event.target;if(form.id!=='edit-op-form')return;
  event.preventDefault();event.stopImmediatePropagation();const button=form.querySelector('button');if(button.disabled)return;button.disabled=true;
  try{await saveOpportunityEdit(form);}catch(error){failure(error);}finally{button.disabled=false;}
},true);
