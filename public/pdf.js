async function buildOfficialPdf(student,field) {
  const dates=internshipDates(student);
  if(!dates.length) throw Error('Nenhum dia de estágio corresponde à escala nesse período.');
  const {PDFDocument,StandardFonts,rgb}=PDFLib;
  const source=await PDFDocument.load(OFFICIAL_PDF_BASE64);
  const output=await PDFDocument.create();
  const font=await output.embedFont(StandardFonts.Helvetica);
  // Copy the original artwork, table, logo and instructions without rebuilding them.
  for(let offset=0;offset<dates.length;offset+=27) {
    const [page]=await output.copyPages(source,[0]); output.addPage(page);
    const height=page.getHeight();
    const text=(value,x,top,width,size=9)=>{
      value=String(value||'');
      const fit=Math.min(size,width/font.widthOfTextAtSize(value||' ',1));
      page.drawText(value,{x,y:height-top-fit,size:fit,font,color:rgb(0,0,0)});
    };
    text([student.nome,student.sobrenome].filter(Boolean).join(' '),198,130,339,10);
    page.drawRectangle({x:209,y:height-152,width:29,height:11,color:rgb(1,1,1)});
    text(student.local_externo||field.nome,210,142,322,9);
    text(student.preceptor_externo||field.preceptor,151,155,196,9);
    text(`${formatDate(student.tce_inicio)} - ${formatDate(student.tce_fim)}`,381,155,75,6);
    text(student.turma,504,155,50,8);
    const chunk=dates.slice(offset,offset+27);
    chunk.forEach((date,i)=>{
      const top=204+i*(420/27);
      text(DAY_NAMES[parseDay(date).getUTCDay()].toUpperCase(),34,top,74,8);
      text(formatDate(date),115,top,79,9);
      text(`${student.horas_por_periodo||field.horas_por_periodo}h`,375,top,52,9);
    });
    text(`${chunk.length*(student.horas_por_periodo||field.horas_por_periodo)}h`,438,625,115,9);
  }
  const [instructions]=await output.copyPages(source,[1]); output.addPage(instructions);
  return output.save();
}
async function generateOfficialFichaPdf(student,field) {
  const bytes=await buildOfficialPdf(student,field);
  const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
  const a=document.createElement('a');a.href=url;a.download=`Ficha_Frequencia_${student.nome}_${student.tce_inicio}_${student.tce_fim}.pdf`;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
}
