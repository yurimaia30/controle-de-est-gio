// Presentation from the local RADCONTROL, connected to the existing Firebase schema.
const FIELD_ORDER=['IOT','SESI','UPA-MANHA','UPA-G1','UPA-G2','UPA-G3','UPA-G4'];
const arrangedFields=()=>[...fields].sort((a,b)=>FIELD_ORDER.indexOf(a.id)-FIELD_ORDER.indexOf(b.id));
function decorateInterface(){
 document.querySelectorAll('#content table,#dialog table').forEach(t=>t.classList.add('data-table'));
 document.querySelectorAll('#content button,#dialog button').forEach(b=>{b.classList.add('btn');b.classList.add(b.classList.contains('secondary')||b.classList.contains('danger')?'btn-secondary':'btn-primary');});
 document.querySelectorAll('#nav button').forEach(b=>b.classList.add('nav-btn'));
 const subtitles={dashboard:'Quadro oficial de vagas, metas de 400h e monitoramento de TCEs',fields:'Quadro organizado conforme a planilha de estágio',attendance:'Selecione o campo e a data para registrar a frequência',students:'Cadastro, histórico e acompanhamento das horas',external:'Acompanhamento em instituições não parceiras',preceptors:'Responsáveis pelos campos de estágio'};
 $('page-subtitle').textContent=subtitles[view]||'';
 if(view==='dashboard')$('page-title').textContent='Dashboard Principal';
 if(view==='fields')$('page-title').textContent='Quadro Oficial de Vagas';
}
function renderDashboard(){
 mustAdmin();const contracts=tces(),states=contracts.map(t=>Domain.tceStatus(t)),totals=students.map(s=>Domain.totalHours(approvals,s));
 const kpi=(label,value,color,hint='')=>`<article class="kpi-card ${color}"><div class="kpi-header"><span class="kpi-label">${label}</span></div><div class="kpi-val">${value}</div>${hint?`<p class="kpi-hint">${hint}</p>`:''}</article>`;
 const alerts=contracts.filter(t=>{const s=Domain.tceStatus(t);return s.days!==null&&s.days<=30;}).sort((a,b)=>a.end.localeCompare(b.end));
 $('content').innerHTML=`<div class="kpi-grid-main">${kpi('Alunos em acompanhamento',totals.filter(h=>h<400).length,'cyan','Menos de 400h homologadas')}${kpi('Meta de horas concluída',totals.filter(h=>h>=400).length,'emerald','400h ou mais homologadas')}${kpi('Horas homologadas',hoursText(totals.reduce((a,b)=>a+b,0)),'blue')}${kpi('Horas pendentes',hoursText(totals.reduce((a,b)=>a+Math.max(0,400-b),0)),'purple','Saldo para a meta de 400h')}</div>
 <h2 class="kpi-section-title dashboard-section">Vigência dos TCEs</h2><div class="kpi-grid-tces">${kpi('Ativos',states.filter(s=>s.active).length,'emerald')}${kpi('Vencem em 30 dias',states.filter(s=>s.active&&s.days<=30).length,'purple')}${kpi('Vencem em 7 dias',states.filter(s=>s.active&&s.days<=7).length,'amber')}${kpi('Vencidos',states.filter(s=>s.label==='Vencido').length,'rose')}</div>
 <h2 class="kpi-section-title">Campos de Estágio e Preceptores</h2><div class="fields-grid">${arrangedFields().map(f=>{
 const usable=f.slots.filter(s=>!s.bloqueada),free=usable.filter(s=>!s.aluno).length;
 return `<article class="field-card"><div class="field-header"><div><span class="field-badge badge-${f.group.toLowerCase()}">${esc(f.id)}</span><h3 style="margin-top:10px">${esc(f.nome)}</h3><p>${esc(f.turno)}</p></div></div><p style="color:var(--cyan-accent)">☢ ${esc(f.preceptor)}</p><p class="field-metric">${usable.length?`${free} livres · ${usable.length-free} ocupadas`:'Capacidade não informada na planilha'}</p>${['IOT','SESI'].includes(f.id)?'<small>Contagem de posições ao longo da semana.</small>':''}<div style="margin-top:14px">${button('Ver quadro de vagas','show-field',f.id)}</div></article>`;
 }).join('')}</div>
 <h2 class="kpi-section-title">Alertas de vencimento</h2>${tceTable(alerts)}
 <h2 class="kpi-section-title">Alunos próximos de concluir</h2><div class="card">${students.filter(s=>{const h=Domain.totalHours(approvals,s);return h>=360&&h<400;}).map(s=>`<p><strong>${esc(s.nome)}</strong> · ${hoursText(Domain.totalHours(approvals,s))} / 400h</p>`).join('')||'<p>Nenhum aluno entre 360h e 400h homologadas.</p>'}</div>`;
}
function slotActions(f,s){if(!admin()||!s)return '';return `<details class="slot-actions"><summary>Gerenciar</summary><div>${!s.bloqueada?button(s.aluno?'Período / ficha':'Alocar aluno','slot',f.id+'|'+s.id):''}${button('Observação','slot-note',f.id+'|'+s.id)}${s.aluno?button('Liberar','release',f.id+'|'+s.id,'danger'):''}</div></details>`;}
function slotContent(f,s){if(!s)return '<span class="locked">—</span>';return `${s.bloqueada?'<span class="locked">X — indisponível</span>':s.aluno?`<strong>${esc(s.aluno)}</strong>`:'<strong class="good">Vaga livre</strong>'}${s.obs?`<small class="note">${esc(s.obs)}</small>`:''}${slotActions(f,s)}`;}
function fieldHeader(f){return `<div class="sheet-header"><div><span class="field-badge badge-${f.group.toLowerCase()}">${esc(f.id)}</span><h2>${esc(f.nome)} · ${esc(f.turno)}</h2><p>☢ ${esc(f.preceptor)}</p></div>${admin()?button('Nova oportunidade','op',f.id):''}</div>`;}
function fieldNotes(f){return `<div class="field-notes"><h3>Observações do campo</h3><p class="note">${esc(f.observacoes)||'Nenhuma observação cadastrada.'}</p>${admin()?button('Editar observações','field-note',f.id):''}${admin()&&f.id==='UPA-MANHA'?button('Cadastrar vaga confirmada','new-slot',f.id):''}</div>`;}
function fieldMatrix(f){
 const days=[1,2,3,4,5,6,0].filter(d=>f.slots.some(s=>s.dias.includes(d)));
 const numbers=[...new Set(f.slots.map(s=>s.vaga))].sort((a,b)=>a-b);
 return `<article class="table-container sheet-panel" id="field-${f.id}">${fieldHeader(f)}<div class="table-scroll"><table class="data-table matrix"><thead><tr><th>Vaga</th>${days.map(d=>`<th>${Domain.days[d]}</th>`).join('')}</tr></thead><tbody>${numbers.map(n=>`<tr><td><strong>${n}</strong></td>${days.map(d=>{const s=f.slots.find(s=>s.vaga===n&&s.dias.includes(d));return `<td class="${s?.bloqueada?'blocked':!s?.aluno?'free':''}">${slotContent(f,s)}</td>`;}).join('')}</tr>`).join('')}</tbody></table></div>${!f.slots.length?'<p style="padding:20px">Vagas não informadas na planilha.</p>':''}${fieldNotes(f)}</article>`;
}
function upaTable(f){return `<article class="table-container sheet-panel" id="field-${f.id}">${fieldHeader(f)}<div class="table-scroll"><table class="data-table"><thead><tr><th>Vaga</th><th>Aluno</th><th>Início</th><th>Término</th></tr></thead><tbody>${[...f.slots].sort((a,b)=>a.vaga-b.vaga).map(s=>`<tr><td>${s.vaga}</td><td>${slotContent(f,s)}</td><td>${fmt(s.inicio)}</td><td>${fmt(s.fim)}</td></tr>`).join('')}</tbody></table></div>${fieldNotes(f)}</article>`;}
function renderFields(){
 const ordered=arrangedFields(),week=ordered.filter(f=>!/^UPA-G/.test(f.id)),groups=ordered.filter(f=>/^UPA-G/.test(f.id));
 $('content').innerHTML=`<div class="field-links">${ordered.map(f=>button(f.id,'show-field',f.id)).join('')}</div>${week.map(fieldMatrix).join('')}${groups.length?'<h2 class="kpi-section-title">UPA — Noite e finais de semana</h2><div class="upa-grid">'+groups.map(upaTable).join('')+'</div>':''}${ordered.length?'':'<div class="card">Nenhum campo disponível para este acesso.</div>'}`;
}
function renderPreceptors(){mustAdmin();$('content').innerHTML=`<div class="fields-grid">${arrangedFields().map(f=>`<article class="field-card"><span class="field-badge badge-${f.group.toLowerCase()}">${esc(f.id)}</span><h2 style="margin-top:16px">☢ ${esc(f.preceptor)}</h2><p>${esc(f.nome)} · ${esc(f.turno)}</p></article>`).join('')}</div>`;}
function formatDate(date){return date?date.split('-').reverse().join('/'):'Não informado';}
async function downloadFicha(op){return generateOfficialFichaPdf({nome:op.studentName,sobrenome:'',turma:op.turma,tce_inicio:op.start,tce_fim:op.end,dias:op.days.map(d=>DAY_NAMES[d]),horas_por_periodo:op.hours,local_externo:op.local,preceptor_externo:op.preceptor},{nome:op.fieldName,preceptor:op.preceptor,horas_por_periodo:op.hours});}
document.addEventListener('click',e=>{const b=e.target.closest('[data-action="show-field"]');if(!b)return;view='fields';render();document.getElementById('field-'+b.dataset.id)?.scrollIntoView({behavior:'smooth',block:'start'});});
// The same styles apply to forms opened after a render.
const originalModal=modal;
modal=function(html){originalModal(html);decorateInterface();};
