'use strict';
const DOCX_NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';

const fichaText=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
const fichaDate=date=>date.split('-').reverse().join('/');
const weekday=date=>Domain.days[new Date(date+'T12:00:00Z').getUTCDay()];
const nodeText=node=>[...node.getElementsByTagNameNS(DOCX_NS,'t')].map(item=>item.textContent).join('');

function fichaSetCell(cell,value){
  const texts=[...cell.getElementsByTagNameNS(DOCX_NS,'t')];
  if(texts.length){
    texts[0].textContent=value;
    texts.slice(1).forEach(text=>text.textContent='');
    return;
  }
  const paragraph=cell.getElementsByTagNameNS(DOCX_NS,'p')[0];
  const run=paragraph.ownerDocument.createElementNS(DOCX_NS,'w:r');
  const text=paragraph.ownerDocument.createElementNS(DOCX_NS,'w:t');
  text.setAttribute('xml:space','preserve');text.textContent=value;run.append(text);paragraph.append(run);
}

function fichaOccurrences(op){
  return attendance.filter(record=>record.opportunityId===op.id&&['falta','feriado'].includes(record.status))
    .sort((a,b)=>a.date.localeCompare(b.date))
    .map(record=>fichaDate(record.date)+' ('+(record.status==='feriado'?'feriado':'falta')+')').join(', ')||'—';
}

async function downloadAttendanceDocx(op){
  const response=await fetch('ficha-acompanhamento.docx');
  if(!response.ok)throw Error('Não foi possível carregar o modelo da ficha. Atualize a página e tente novamente.');
  const zip=await JSZip.loadAsync(await response.arrayBuffer());
  const xml=await zip.file('word/document.xml').async('string');
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  if(doc.querySelector('parsererror'))throw Error('O modelo da ficha está inválido.');
  const data={
    ALUNO:op.studentName,
    LOCAL:op.local||op.fieldName,
    PRECEPTOR:op.preceptor,
    PERIODO:fichaDate(op.start)+' a '+fichaDate(op.end),
    TURMA:op.turma,
    OCORRENCIAS:fichaOccurrences(op)
  };
  const rows=[...doc.getElementsByTagNameNS(DOCX_NS,'tr')];
  const marker=rows.find(row=>nodeText(row).includes('{{DIA}}'));
  if(!marker)throw Error('O modelo não possui a linha diária da ficha.');
  const parent=marker.parentNode;
  for(const date of op.dates){
    const row=marker.cloneNode(true),cells=[...row.getElementsByTagNameNS(DOCX_NS,'tc')];
    fichaSetCell(cells[0],weekday(date));fichaSetCell(cells[1],fichaDate(date));
    parent.insertBefore(row,marker);
  }
  parent.removeChild(marker);
  let output=new XMLSerializer().serializeToString(doc);
  for(const [key,value] of Object.entries(data))output=output.replaceAll('{{'+key+'}}',fichaText(value));
  if(output.includes('{{')||output.includes('Total de horas'))throw Error('A ficha não foi preenchida corretamente.');
  zip.file('word/document.xml',output);
  const blob=await zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',compression:'DEFLATE'});
  const url=URL.createObjectURL(blob),anchor=document.createElement('a');
  anchor.href=url;anchor.download='Ficha de Frequência - '+op.studentName.replace(/[^\p{L}\p{N} ._-]/gu,'')+'.docx';anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}

// The old PDF action remains the same control point; it now downloads the supplied Word template.
async function downloadFicha(op){return downloadAttendanceDocx(op);}

function renderAttendance(){
  if(!fields.some(field=>field.id===selectedField))selectedField=fields[0]?.id||'';
  const field=fields.find(item=>item.id===selectedField);
  const ops=opportunities.filter(op=>op.fieldId===selectedField&&op.dates.includes(selectedDate));
  $('content').innerHTML=`<div class="card"><div class="row toolbar"><label>Campo<select id="att-field">${fields.map(item=>`<option value="${item.id}" ${item.id===selectedField?'selected':''}>${esc(item.nome)}</option>`).join('')}</select></label><label>Data<input id="att-date" type="date" value="${selectedDate}" max="${Domain.today()}"></label></div><p><span class="radiation">☢</span> ${esc(field?.preceptor||'')}</p><p>Somente alunos com período e dias cadastrados aparecem na chamada. Feriado não contabiliza horas; somente presenças entram na autorização.</p><form id="attendance-form">${ops.map(op=>{const record=attendance.find(item=>item.id===Domain.attendanceId(op.id,selectedDate));return `<div class="row between card"><div><strong>${esc(op.studentName)}</strong><small> · ${esc(op.turma)} · ${op.hours}h previstas</small><p>${fmt(op.start)} a ${fmt(op.end)}</p></div><label>Situação<select name="${op.id}" required><option value="">Não registrada</option><option value="presente" ${record?.status==='presente'?'selected':''}>Presente</option><option value="falta" ${record?.status==='falta'?'selected':''}>Falta</option><option value="feriado" ${record?.status==='feriado'?'selected':''}>Feriado</option></select></label></div>`;}).join('')||'<p class="empty">Nenhum aluno com oportunidade cadastrada para este campo e esta data.</p>'}${ops.length?'<button>Salvar chamada</button>':''}</form></div>`;
}
