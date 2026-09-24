/* Copy the supplied PDF pages verbatim and fill only the blank fields. */
async function buildFicha(op, templateBytes, layout, lib=PDFLib) {
  const {PDFDocument,StandardFonts,rgb}=lib;
  const source=await PDFDocument.load(templateBytes), doc=await PDFDocument.create();
  const font=await doc.embedFont(StandardFonts.Helvetica);
  const scheduled=Domain.datesBetween(op.start,op.end,op.days);
  for(let offset=0;offset<scheduled.length;offset+=layout.rows.length) {
    const [page,back]=await doc.copyPages(source,[0,1]);
    doc.addPage(page);
    const text=(value,x,top,width,size=9)=>{
      const str=String(value||'');
      while(font.widthOfTextAtSize(str,size)>width && size>5) size-=.2;
      page.drawText(str,{x,y:page.getHeight()-top-size,size,font,color:rgb(0,0,0)});
    };
    // Erase the example institution only; retain the original lines and labels.
    page.drawRectangle({x:207,y:page.getHeight()-151,width:323,height:11,color:rgb(1,1,1)});
    text(op.studentName,202,128,335);
    text(op.local || op.fieldName,210,141,320);
    text(op.preceptor,151,154,195,8);
    text(op.start.split('-').reverse().join('/')+' a '+op.end.split('-').reverse().join('/'),383,154,74,6);
    text(op.turma,505,154,48,8);
    const chunk=scheduled.slice(offset,offset+layout.rows.length);
    chunk.forEach((date,i)=>{
      const top=layout.rows[i]+3;
      text(Domain.days[new Date(date+'T12:00:00Z').getUTCDay()],35,top,72,8);
      text(date.split('-').reverse().join('/'),115,top,78,8);
      text(op.hours+'h',378,top,50,8);
    });
    // Signatures and total remain blank: scheduled hours are not earned hours.
    doc.addPage(back);
  }
  return doc.save();
}
async function downloadFicha(op) {
  const [template,layout]=await Promise.all([fetch('modelo-frequencia.pdf').then(r=>{if(!r.ok)throw Error('Modelo PDF indisponível');return r.arrayBuffer();}),fetch('pdf-layout.json').then(r=>r.json())]);
  const bytes=await buildFicha(op,template,layout);
  const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
  const a=document.createElement('a');a.href=url;a.download=`Frequencia_${op.studentName}_${op.start}_${op.end}.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
