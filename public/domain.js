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
  const historicalHours=student=>student.historicalAuthorization?.authorized===true?Number(student.horasPlanilha)||0:0;
  const totalHours=(approvals,student)=>historicalHours(student)+approvedHours(approvals,student.id);
  function tceStatus(tce,date=today()){
    if(!tce.end)return {label:'Sem término',days:null,active:false};
    const days=Math.round((Date.parse(tce.end+'T12:00:00Z')-Date.parse(date+'T12:00:00Z'))/86400000);
    if(!Number.isFinite(days))return {label:'Data inválida',days:null,active:false};
    if(days<0)return {label:'Vencido',days,active:false};
    if(tce.start&&tce.start>date)return {label:'A iniciar',days,active:false};
    return {label:days<=7?'Vence em até 7 dias':days<=15?'Vence em até 15 dias':days<=30?'Vence em até 30 dias':'Ativo',days,active:true};
  }
  const attendanceId=(op,date)=>op+'_'+date;
  const normalized=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
  function orderedStudents(students,query='',order='alpha'){
    const words=normalized(query).trim().split(/\s+/).filter(Boolean);
    const list=students.filter(s=>words.every(word=>normalized(s.nome+' '+(s.turma||'')).includes(word)));
    const registration=s=>{const match=/^planilha-linha-(\d+)$/.exec(s.id);if(match)return [0,Number(match[1])];const time=s.createdAt?.toMillis?.()??(s.createdAt?.seconds? s.createdAt.seconds*1000:Date.parse(s.createdAt));return [1,Number.isFinite(time)?time:Number.MAX_SAFE_INTEGER];};
    return list.sort((a,b)=>{if(order==='registration'){const x=registration(a),y=registration(b);return x[0]-y[0]||x[1]-y[1]||a.id.localeCompare(b.id,'pt-BR',{numeric:true});}return a.nome.localeCompare(b.nome,'pt-BR',{sensitivity:'base'})||a.id.localeCompare(b.id,'pt-BR',{numeric:true});});
  }
  function loginAddress(username){
    const name=String(username).trim().toLowerCase();
    if(!['yuri','luiz','iot','sesi','upa'].includes(name))throw Error('Usuário inválido. Use yuri, luiz, iot, sesi ou upa.');
    return name+'@acesso.controle-de-estagio.invalid';
  }
  const api={days,datesBetween,today,canAccess,approvedHours,historicalHours,totalHours,tceStatus,attendanceId,loginAddress,orderedStudents};
  if(typeof module!=='undefined') module.exports=api; else root.Domain=api;
})(globalThis);
