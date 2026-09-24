# Verificação da atualização

## Verificado localmente

- Extração dos 89 alunos, 13 registros de espera e sete campos (seis presentes no quadro e UPA manhã solicitada).
- Comparação célula a célula das vagas de IOT/SESI; posições vazias, X e datas da UPA preservados.
- Seis testes automatizados: datas inclusivas, meses diferentes, datas inválidas, ano bissexto, isolamento lógico dos campos, saldo dependente de autorização e login por usuário.
- Navegador com Firebase simulado: menus e consultas restritos para IOT/SESI/UPA; chamada salva duas vezes produz um registro; presença não credita horas; autorização de Yuri produz o saldo esperado.
- PDF gerado sobre as páginas originais; conferência visual da frente e do verso; início/fim verificados no texto; período longo gera 20 páginas sem cortar datas.
- Sintaxe JavaScript dos módulos verificada.

## Implantação concluída

- Authentication por senha ativado; cinco contas criadas: yuri, luiz, iot, sesi e upa.
- Regras do Firestore e Hosting publicados em https://controle-de-estagio.web.app.
- Planilhas importadas no banco real; documento legado preservado.
- Quatro testes das regras passaram no emulador do Firestore, incluindo isolamento, gravação de frequência e aprovação das horas.
- Os cinco logins foram validados no Firebase real. IOT, SESI e UPA acessaram o próprio campo e receberam HTTP 403 ao consultar outros campos, cadastro global de alunos e documento legado.
- Download do arquivo privado de senhas iniciais confirmado como Sucesso pelo Cloud Shell.
- IAM conferido: Yuri Maia é Proprietário. Não houve alteração da permissão da conta Google.

Datas ausentes na fonte permanecem pendentes para cadastro na alocação. A capacidade da UPA manhã não foi inventada: o preceptor Artur Nogueira está configurado, mas as vagas dependem de informação da coordenação.

## Correção solicitada em 24/09/2026

- Planilha atualizada aplicada ao Firebase com comparação de cada vaga, aluno, dia e período de IOT, SESI e UPA. MEDSAUDE não criado como campo.
- 89 TCEs recuperados do documento anterior, com datas originais preservadas e edição pela coordenação.
- Saldo histórico de CONTROLE DE HORAS expressamente autorizado por Yuri e Luiz: 20.819h. As novas horas continuam dependendo de encerramento e aprovação.
- Oito testes de domínio aprovados, incluindo saldo histórico sem duplicação e limites dos alertas de TCE. Reconciliação independente da fonte e do banco real aprovada.
- Dashboard e controle de horas conferidos no navegador contra o Firebase publicado. Cache corrigido para carregar a versão nova.
