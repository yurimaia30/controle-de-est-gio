# Atualização — geração de TCE

## Como usar
1. Cadastre a oportunidade normalmente, com aluno, campo, período, dias e horas.
2. Na confirmação, clique em Gerar TCE do campo. Para oportunidades existentes, use Gerar TCE em Controle de horas.
3. Confira matrícula, RG, CPF, preceptor, CRTR, turno, horário, apólice e cobertura do seguro. Não são reaproveitados os dados dos alunos presentes nos modelos de exemplo.
4. Clique em Salvar e baixar TCE (.docx). O registro aparece em Controle de TCEs e no dashboard. Baixar TCE repete a última emissão salva; Dados do TCE permite revisar e emitir novamente.

A razão social do SESI foi corrigida conforme autorizado. Logotipos, tabelas, estilos, cabeçalhos, rodapés e cláusulas são mantidos a partir dos arquivos enviados. A previsão total considera cada data da oportunidade, inclusive início e fim, conforme os dias selecionados; não desconta feriados automaticamente. Jornada semanal é o número de dias distintos por semana vezes as horas por dia. Horário e intervalos devem ser conferidos pela coordenação.

Dados pessoais ficam nas coleções administrativas students/settings; não são gravados em fields ou opportunities. IOT, SESI e UPA não recebem acesso à emissão dos TCEs. Estágios externos não têm modelo automático. Os campos adicionais são preenchidos antes da primeira emissão, pois não constam do cadastro atual. O cadastro manual de TCE continua disponível para documentos antigos e externos.

O download é em Word. Não há conversão automática para PDF no sistema. A geração foi testada no navegador com Firebase simulado para Yuri e Luiz nos três modelos. As verificações de estrutura confirmaram que a geração altera somente o texto do documento dentro do DOCX. A paginação não foi validada visualmente: o renderizador deste computador está indisponível. Confira a primeira emissão de cada modelo no Word antes de utilizá-la.

## Publicar
Envie RadControl-TCE.zip ao Cloud Shell e execute:

```bash
unzip -o RadControl-TCE.zip -d radcontrol-tce
bash radcontrol-tce/publicar.sh
```

Depois atualize o navegador com Ctrl+F5. O pacote inclui também lista de espera editável, exclusão de cadastro ativo e lançamento de horas antigas. Usa as regras existentes; publica somente Hosting. Esta atualização ainda não foi publicada automaticamente.

Para GitHub, envie o conteúdo de envio-github na raiz do repositório, preservando a pasta public.
