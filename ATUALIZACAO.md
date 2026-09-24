# Atualização: lista de espera e horas antigas

Em Controle de horas, cada aluno tem Lançar horas antigas e Excluir aluno.
Horas antigas exigem instituição, período, horas e justificativa; o saldo soma esses lançamentos ao histórico e às horas aprovadas. Não altera TCEs ou frequências. Informe apenas horas ainda não contabilizadas.
A exclusão remove o cadastro ativo e o aluno dos totais; guarda cópia administrativa em settings e mantém oportunidades, frequências e autorizações. Vagas vinculadas precisam ser liberadas antes. Confira manualmente referências antigas sem vínculo e a lista de espera.
A lista de espera permite adicionar, editar e retirar registros, sem excluir o cadastro do aluno.
Somente Yuri e Luiz podem realizar essas operações, usando as regras atuais do Firebase.

## Publicação
Envie RadControl-gestao-alunos.zip ao Cloud Shell e execute:

```bash
unzip -o RadControl-gestao-alunos.zip -d radcontrol-gestao-alunos
bash radcontrol-gestao-alunos/publicar.sh
```

Atualize o site com Ctrl+F5. Este pacote publica somente Hosting.

## Testes
Testes de navegador com Firebase simulado passaram para cinco perfis, edição da espera, conflito entre edições, horas sem duplicação, bloqueio de exclusão com vaga vinculada e cópia administrativa. A nova atualização ainda precisa ser publicada e conferida no Firebase real.

## TCEs
O preenchimento automático dos modelos de TCE por campo ainda não foi implementado. Depende do envio e mapeamento dos modelos e dos dados obrigatórios de aluno/campo.
