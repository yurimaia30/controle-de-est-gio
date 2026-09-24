/* Calendar rules shared by attendance and the official PDF. Dates are inclusive. */
const DAY_NAMES = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
function parseDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) throw Error('Informe as datas inicial e final do estágio.');
  const d = new Date(value + 'T12:00:00Z');
  if (!Number.isFinite(+d) || d.toISOString().slice(0,10) !== value) throw Error('Data inválida.');
  return d;
}
function internshipDates(student) {
  const start = parseDay(student.tce_inicio), end = parseDay(student.tce_fim);
  if (start > end) throw Error('O término deve ser igual ou posterior ao início.');
  if (!student.dias?.length || student.dias.some(d => !DAY_NAMES.includes(d))) throw Error('Selecione os dias de estágio do aluno.');
  const dates=[];
  for (let d=new Date(start); d<=end; d.setUTCDate(d.getUTCDate()+1)) {
    if(student.dias.includes(DAY_NAMES[d.getUTCDay()])) dates.push(d.toISOString().slice(0,10));
  }
  return dates;
}
function isScheduled(s,date) {
  return s.status==='Ativo' && s.tce_inicio && s.tce_fim && date>=s.tce_inicio && date<=s.tce_fim && (s.dias||[]).includes(DAY_NAMES[parseDay(date).getUTCDay()]);
}
function scopeOf(campo) { return campo.startsWith('UPA') ? 'UPA' : campo; }
function canAccess(profile,campo) { return !!profile && (profile.role==='admin' || profile.scope===scopeOf(campo)); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
if(typeof module!=='undefined') module.exports={DAY_NAMES,parseDay,internshipDates,isScheduled,scopeOf,canAccess};
