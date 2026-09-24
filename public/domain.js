(function(root) {
  const days = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  function datesBetween(start,end,weekdays) {
    const valid = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)) && new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
    if (!valid(start) || !valid(end) || start>end) throw Error('Informe um período válido: início até término.');
    if (!weekdays.length || weekdays.some(d=>!Number.isInteger(d)||d<0||d>6)) throw Error('Selecione os dias de estágio.');
    const dates=[];
    for(let d=new Date(start+'T12:00:00Z');d<=new Date(end+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1)) {
      if(weekdays.includes(d.getUTCDay())) dates.push(d.toISOString().slice(0,10));
      if(dates.length>1500) throw Error('Período muito longo. Revise as datas.');
    }
    if(!dates.length) throw Error('O período não contém os dias escolhidos.');
    return dates;
  }
  const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Fortaleza',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const canAccess=(profile,group)=>!!profile && ((profile.role==='admin'&&['Yuri Maia','Luiz Paulo'].includes(profile.name))||(profile.role==='field'&&profile.group===group));
  const approvedHours=(approvals,studentId)=>approvals.filter(a=>a.studentId===studentId).reduce((n,a)=>n+a.hours,0);
  const attendanceId=(op,date)=>op+'_'+date;
  function loginAddress(username){
    const name=String(username).trim().toLowerCase();
    if(!['yuri','luiz','iot','sesi','upa'].includes(name))throw Error('Usuário inválido. Use yuri, luiz, iot, sesi ou upa.');
    return name+'@acesso.controle-de-estagio.invalid';
  }
  const api={days,datesBetween,today,canAccess,approvedHours,attendanceId,loginAddress};
  if(typeof module!=='undefined') module.exports=api; else root.Domain=api;
})(globalThis);
