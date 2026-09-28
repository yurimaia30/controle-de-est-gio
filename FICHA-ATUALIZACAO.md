# Atualização da ficha e frequência

A ficha PDF anterior foi substituída pelo modelo Word enviado, preservando o cabeçalho, as tabelas, as instruções e os espaços de assinatura.

Ao baixar a ficha, o sistema gera um arquivo `.docx` com uma linha para cada data de estágio da oportunidade. A tabela não possui linha nem total de horas. As colunas de atividade, carga horária e assinaturas permanecem vazias para preenchimento manual. Faltas e feriados registrados antes do download são listados na observação da ficha; ambos não são contabilizados nas horas autorizadas.

Em Chamada por campo, as opções são Presente, Falta e Feriado. IOT, SESI e UPA registram apenas os alunos e as datas do próprio campo. Apenas Yuri e Luiz podem editar oportunidades sem horas já autorizadas. Depois de existir frequência, período, dias e horas ficam bloqueados para preservar o histórico; turma, preceptor e observações continuam editáveis.

## Publicação

Envie `RadControl-ficha-frequencia.zip` ao Cloud Shell e execute:

```bash
unzip -o RadControl-ficha-frequencia.zip -d radcontrol-ficha-frequencia
bash radcontrol-ficha-frequencia/publicar.sh
```

Esse comando publica o aplicativo e as regras do Firestore. Em seguida, use Ctrl+F5 no sistema.

## Verificação

A geração em navegador foi conferida com três dias de estágio: cabeçalho mais três linhas, sem total de horas, falta registrada e feriado salvo. A ficha ainda deve ser aberta uma vez no Word após a publicação para conferência visual, pois o renderizador de documentos não está disponível neste computador.
