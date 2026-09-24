const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
global.Domain=require('../public/domain.js');
const pdf=require(path.join(process.env.CODEX_NODE_MODULES,'pdf-lib'));
vm.runInThisContext(fs.readFileSync('public/ficha.js','utf8'));
(async()=>{
  const op={studentName:'ALUNO DE TESTE',fieldName:'UPA Grupo 4',preceptor:'Erick Carvalho',turma:'RAD19',start:'2026-08-30',end:'2026-12-13',days:[0],hours:12};
  const bytes=await buildFicha(op,fs.readFileSync('public/modelo-frequencia.pdf'),JSON.parse(fs.readFileSync('public/pdf-layout.json')),pdf);
  fs.mkdirSync('tmp/pdfs',{recursive:true});fs.writeFileSync('tmp/pdfs/ficha-teste.pdf',bytes);
  const doc=await pdf.PDFDocument.load(bytes);if(doc.getPageCount()!==2)throw Error('Quantidade de páginas incorreta');
  op.start='2026-01-01';op.end='2026-12-31';op.days=[1,2,3,4,5];
  const long=await buildFicha(op,fs.readFileSync('public/modelo-frequencia.pdf'),JSON.parse(fs.readFileSync('public/pdf-layout.json')),pdf);
  const pages=(await pdf.PDFDocument.load(long)).getPageCount();
  if(pages!==Math.ceil(Domain.datesBetween(op.start,op.end,op.days).length/27)*2)throw Error('Paginação incorreta');
  console.log('PDF original preservado, período curto e paginação longa: OK ('+pages+' páginas)');
})().catch(e=>{console.error(e);process.exitCode=1;});
