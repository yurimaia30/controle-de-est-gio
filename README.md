# Controle de estágios de Radiologia

Aplicação conectada ao projeto Firebase existente `controle-de-estagio`. O código público fica em `public/`. A entrada da raiz encaminha o endereço antigo para o sistema publicado em https://controle-de-estagio.web.app.

## Ativação no Firebase

1. Habilitar **Authentication > Email/Password** no projeto existente e conferir os domínios autorizados.
2. Instalar dependências com `npm install` e autenticar o Firebase CLI com `npx firebase login`.
3. Criar as cinco contas e seus documentos `profiles/{uid}` pelo Console ou executar `npm run provision` com credenciais administrativas locais (Application Default Credentials). Não colocar credenciais na pasta `public`.
4. Os perfis de Yuri Maia e Luiz Paulo devem ter `role: "admin"`, `name` correspondente e `group: null`. IOT, SESI e UPA devem ter `role: "field"`, `name` e `group` iguais ao nome do campo. As regras proíbem editar os perfis pelo aplicativo.
5. Publicar regras e aplicativo juntos: `npm run deploy`. Não disponibilizar o frontend sem as regras de segurança.
6. Entrar como Yuri ou Luiz, abrir **Importar planilhas** e selecionar `private/importacao-planilhas.json`. Importação idempotente: preserva registros existentes. O documento anterior `radcontrol/estado_principal` não é sobrescrito e pode ser exportado na mesma tela.
7. Entregar a cada responsável sua senha inicial. O script gera senhas aleatórias em `private/senhas-iniciais-*.json` e não redefine contas existentes. O usuário pode trocar sua própria senha após entrar. Nenhuma senha é publicada no frontend.

O login é por **usuário e senha**, sem e-mail pessoal: `yuri`, `luiz`, `iot`, `sesi`, `upa`. Internamente, o Firebase Email/Password usa os identificadores `USUARIO@acesso.controle-de-estagio.invalid`, no domínio reservado `.invalid` (sem caixa postal). Para configurar pelo Console, use esses identificadores no Authentication e associe o UID ao perfil correspondente. Recuperação de senha deve ser feita pela coordenação no Firebase, não por e-mail. O script não envia mensagens.

## Dados e critérios

- `prepare_data.py` extrai as fontes e gera o JSON privado de importação. Mantém os 89 registros, inclusive nomes duplicados em linhas distintas. Não associa nomes abreviados a cadastros por aproximação.
- IOT e SESI conservam cada célula de vaga/dia. No SESI, vaga 6 é bloqueada com X, exceto quinta-feira. UPA conserva grupos, vagas vazias e datas exatamente como na planilha.
- MEDSAUDE não é oferecido como campo. Histórico de horas dessa instituição é preservado somente como referência administrativa; não é transferido para outro campo.
- UPA manhã tem Artur Nogueira, mas não recebe quantidade inventada de vagas. A coordenação cadastra as vagas confirmadas.
- Horários e horas por plantão não constam do quadro fornecido. Horas por dia são obrigatórias ao cadastrar cada oportunidade; datas ausentes não são inferidas a partir de históricos de outro estágio.
- Oportunidades armazenam data inicial, final, dias da semana e lista exata de datas. O PDF preenche o modelo original e repete o par de páginas a cada 27 dias; assinaturas e total de horas ficam em branco para conferência.
- Chamadas usam IDs de oportunidade + data, sem correspondência por nome e sem duplicação ao salvar novamente. Dias futuros ou fora do período são bloqueados. A frequência não altera o saldo.
- Horas autorizadas são a soma das autorizações, emitidas após 23:59:59 do término no fuso de Fortaleza. Cada oportunidade só pode ser autorizada uma vez. A autorização bloqueia alterações na frequência e registra o responsável.
- Os totais de CONTROLE DE HORAS.xlsx foram expressamente autorizados por Yuri e Luiz e compõem o saldo histórico uma única vez. Novas horas exigem término da oportunidade e aprovação. O dashboard mostra os TCEs recuperados do banco anterior, vencimentos em 7/15/30 dias e ocupação dos campos.
- Perfis dos campos só consultam documentos do próprio grupo e só escrevem frequência. Cadastros gerais, históricos externos, autorizações e dados antigos são exclusivos da coordenação.

## Verificação local

`npm test` testa datas, limites de período, isolamento lógico e saldo aprovado. `npm run serve` abre a aplicação em http://127.0.0.1:4173. Login requer Firebase configurado. Testes do PDF usam `tests/pdf-check.cjs` e a biblioteca `pdf-lib` do runtime indicado por `CODEX_NODE_MODULES`.

Sistema publicado, contas criadas e regras aplicadas. Os cinco logins e o isolamento dos campos foram validados no Firebase real. As instruções de ativação acima são referência de manutenção; não é necessário recriar as contas nem importar novamente.

