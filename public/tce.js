'use strict';
const TCE_GROUPS=['UPA','IOT','SESI'];
const tceXml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const tceDate=value=>value.split('-').reverse().join('/');
function tceValues(op,data){
  if(!TCE_GROUPS.includes(op.group))throw Error('Ainda não há modelo de TCE para este campo.');
  const required=['nome','matricula','rg','cpf','preceptor','crtr','turno','horario','apolice','seguroInicio','seguroFim','assinatura'];
  for(const key of required)if(!String(data[key]||'').trim())throw Error('Preencha todos os dados obrigatórios do TCE.');
  if(!/^[\d.\-\s]+$/.test(data.cpf)||data.cpf.replace(/\D/g,'').length!==11)throw Error('Informe CPF com 11 dígitos.');
  const dates=Domain.datesBetween(op.start,op.end,op.days);
  Domain.datesBetween(data.seguroInicio,data.seguroFim,[0,1,2,3,4,5,6]);
  Domain.datesBetween(data.assinatura,data.assinatura,[0,1,2,3,4,5,6]);
  if(data.seguroInicio>op.start||data.seguroFim<op.end)throw Error('A vigência informada do seguro não cobre todo o estágio. Confira a apólice.');
  if(!Number.isFinite(op.hours)||op.hours<=0||op.hours>24)throw Error('Horas da oportunidade inválidas.');
  const days=[1,2,3,4,5,6,0].filter(d=>op.days.includes(d)).map(d=>Domain.days[d]);
  const number=n=>n.toLocaleString('pt-BR',{maximumFractionDigits:2});
  return {NOME:data.nome.trim(),MATRICULA:data.matricula.trim(),RG:data.rg.trim(),CPF:data.cpf.trim(),PRECEPTOR:data.preceptor.trim(),CRTR:data.crtr.trim(),TURNO:data.turno,PERIODO:tceDate(op.start)+' a '+tceDate(op.end),DIAS_HORARIO:days.join(', ')+' – '+data.horario.trim(),SEMANA:number(new Set(op.days).size*op.hours),TOTAL:number(dates.length*op.hours),APOLICE:data.apolice.trim(),SEGURO_INICIO:tceDate(data.seguroInicio),SEGURO_FIM:tceDate(data.seguroFim),ASSINATURA:new Intl.DateTimeFormat('pt-BR',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(data.assinatura+'T12:00:00Z'))};
}
async function buildTce(op,data){
  const values=tceValues(op,data),response=await fetch('tce-modelos/'+op.group+'.docx');
  if(!response.ok)throw Error('Não foi possível carregar o modelo. Tente novamente.');
  const zip=await JSZip.loadAsync(await response.arrayBuffer());
  let xml=await zip.file('word/document.xml').async('string');
  const seen=new Set();
  xml=xml.replace(/\{\{([A-Z_]+)\}\}/g,(_,key)=>{if(!(key in values))throw Error('Modelo incompatível.');seen.add(key);return tceXml(values[key]);});
  if(seen.size!==15)throw Error('Modelo incompleto. Não foi gerado nenhum TCE.');
  zip.file('word/document.xml',xml);
  return zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',compression:'DEFLATE'});
}
function downloadTceBlob(blob,name){
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='TCE - '+name.replace(/[^\p{L}\p{N} ._-]/gu,'')+'.docx';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function tceOpportunity(id){const op=opportunities.find(o=>o.id===id);if(!op)throw Error('Oportunidade indisponível.');return op;}
function automaticTceModal(id){
  mustAdmin();const op=tceOpportunity(id);if(!TCE_GROUPS.includes(op.group))throw Error('Ainda não há modelo para estágios externos.');
  const student=students.find(s=>s.id===op.studentId),saved=settings['tce-op-'+id];
  const defaults=settings['tce-defaults-'+op.fieldId]?.data||{};
  const data={...defaults,...(student?.tceIdentity||{}),nome:student?.nome||op.studentName,preceptor:op.preceptor,assinatura:Domain.today(),...(saved?.tceData||{})};
  const input=(key,label,type='text')=>`<label>${label}<input name="${key}" type="${type}" value="${esc(data[key])}" required maxlength="160"></label>`;
  modal(`<h2>TCE · ${esc(op.group)}</h2><p>${esc(op.studentName)} · ${esc(op.fieldName)}<br>${fmt(op.start)} a ${fmt(op.end)} · ${Domain.datesBetween(op.start,op.end,op.days).length*op.hours}h previstas.</p><p>Confira os dados antes de emitir. O documento usa o modelo original do campo. Os dados de identificação ficarão salvos no cadastro administrativo do aluno.</p><form id="automatic-tce-form"><input type="hidden" name="opportunityId" value="${esc(id)}"><div class="form-grid">${input('nome','Nome completo')}${input('matricula','Matrícula')}${input('rg','RG')}${input('cpf','CPF')}${input('preceptor','Nome completo do preceptor')}${input('crtr','Registro CRTR')}<label>Turno<select name="turno" required><option value="">Selecione</option>${[['da manhã','Manhã'],['da tarde','Tarde'],['da noite','Noite'],['diurno','Diurno'],['noturno','Noturno']].map(([v,label])=>`<option value="${v}" ${data.turno===v?'selected':''}>${label}</option>`).join('')}</select></label>${input('horario','Horário / intervalos (ex.: das 13h às 17h)')}${input('apolice','Número da apólice confirmada')}${input('seguroInicio','Início da cobertura do seguro','date')}${input('seguroFim','Fim da cobertura do seguro','date')}${input('assinatura','Data de emissão','date')}</div><label><input type="checkbox" required> Conferi identificação, preceptor, horário e cobertura do seguro.</label><button>Salvar e baixar TCE (.docx)</button></form>${saved?.tceData?button('Baixar última emissão salva','tce-download',id):''}`);
}
// All TCE personal data stays in admin-only students/settings, never in fields/opportunities.
async function saveAutomaticTce(form){
  mustAdmin();const f=new FormData(form),id=f.get('opportunityId'),op=tceOpportunity(id);
  const data=Object.fromEntries(['nome','matricula','rg','cpf','preceptor','crtr','turno','horario','apolice','seguroInicio','seguroFim','assinatura'].map(k=>[k,f.get(k).trim()]));
  const blob=await buildTce(op,data);
  const ref=db.collection('students').doc(op.studentId),contract=db.collection('settings').doc('tce-op-'+id),defaults=db.collection('settings').doc('tce-defaults-'+op.fieldId);
  await db.runTransaction(async tx=>{
    const student=await tx.get(ref),previous=await tx.get(contract);
    if(!student.exists)throw Error('O cadastro do aluno foi excluído. Apenas a última emissão salva pode ser baixada.');
    tx.update(ref,{tceIdentity:{matricula:data.matricula,rg:data.rg,cpf:data.cpf}});
    tx.set(contract,{...(previous.data()||{}),type:'tce',opportunityId:id,studentId:op.studentId,studentName:data.nome,fieldName:op.fieldName,start:op.start,end:op.end,number:previous.data()?.number||'',tceData:data,templateVersion:'20260924-v1',opSnapshot:{group:op.group,start:op.start,end:op.end,days:op.days,hours:op.hours},updatedBy:profile.name,updatedAt:stamp()});
    tx.set(defaults,{type:'tce-defaults',data:Object.fromEntries(['turno','horario','apolice','seguroInicio','seguroFim'].map(k=>[k,data[k]]))});
  });
  downloadTceBlob(blob,op.group+' - '+data.nome);$('dialog').close();notify('TCE salvo no Firebase e download iniciado.');
}
async function downloadSavedTce(id){
  mustAdmin();const saved=settings['tce-op-'+id];if(!saved?.tceData)throw Error('Não há emissão salva.');
  if(saved.templateVersion!=='20260924-v1')throw Error('Versão do modelo indisponível.');
  downloadTceBlob(await buildTce(saved.opSnapshot,saved.tceData),saved.opSnapshot.group+' - '+saved.studentName);
}
const originalOpRows=opRows;
opRows=function(ops){return ops.map(op=>originalOpRows([op]).replace('</td></tr>',`${admin()&&TCE_GROUPS.includes(op.group)?button('Gerar TCE','automatic-tce',op.id):''}</td></tr>`)).join('');};
const originalTceRows=tceRows;
tceRows=function(items){return items.map(t=>t.opportunityId&&t.tceData?originalTceRows([t]).replace(button('Editar TCE','tce',t.id),button('Dados do TCE','automatic-tce',t.opportunityId)+button('Baixar TCE','tce-download',t.opportunityId)):originalTceRows([t])).join('');};
document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;try{if(b.dataset.action==='automatic-tce')automaticTceModal(b.dataset.id);if(b.dataset.action==='tce-download'){b.disabled=true;await downloadSavedTce(b.dataset.id);}}catch(err){failure(err);}finally{if(b.dataset.action==='tce-download')b.disabled=false;}});
document.addEventListener('submit',async e=>{const form=e.target;if(form.getAttribute('id')!=='automatic-tce-form')return;e.preventDefault();e.stopImmediatePropagation();const b=form.querySelector('button');if(b.disabled)return;b.disabled=true;try{await saveAutomaticTce(form);}catch(err){failure(err);}finally{b.disabled=false;}},true);
