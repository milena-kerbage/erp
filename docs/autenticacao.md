# Autenticação do Ateliê

O login é validado em Route Handlers do Next.js, com consultas assíncronas ao banco pelo adaptador `src/lib/database.ts`. A produção escolhida para este projeto é **Vercel com PostgreSQL do Supabase**. SQLite permanece disponível para desenvolvimento e testes locais. Não há senha padrão nem credenciais embutidas no código.

O aplicativo mantém sua própria autenticação no esquema privado `erp_auth`; não utiliza o cadastro de usuários do Supabase Auth. Uma conta criada somente no painel do Supabase Auth não autentica este ERP. Os providers do aplicativo carregam os snapshots reais do backend e não inicializam contas, leads ou mensagens fictícias. Consulte [o backend do ERP](erp-backend.md) para contratos e módulos persistidos. Para a integração WhatsApp, consulte também [a documentação da Cloud API](whatsapp-meta.md) e [as pendências de implantação](pendencias-implantacao-whatsapp.md).

## Desenvolvimento e produção

- `npm run dev`: o acesso de visualização às páginas pode ser liberado em desenvolvimento se `AUTH_REQUIRE_LOGIN` não for `true`. Esse modo não cria uma conta e não autoriza as APIs `/api/erp`: elas exigem sessão real ou chave Bearer nas rotas que a aceitam. Para operar a interface e salvar alterações, faça login real em `/login`.
- `AUTH_REQUIRE_LOGIN=true npm run dev`: exige autenticação também localmente, para testes.
- `npm run build` seguido de `npm run start`: exige login sempre. `AUTH_REQUIRE_LOGIN=false` nunca libera produção.
- O runtime do projeto é Node.js; desenvolvimento/testes SQLite requerem Node.js 22.13 ou posterior com `node:sqlite`. Na Vercel, selecione um runtime Node compatível e confira o build antes de publicar.
- Quando `DATABASE_URL` está definido, autenticação, sessões e limitadores usam PostgreSQL compartilhado. Na Vercel (`VERCEL=1`), sua ausência é erro de configuração: o código **não** cria SQLite em disco efêmero como alternativa.
- O banco Supabase, as migrações, as variáveis privadas, o domínio e o HTTPS precisam ser configurados no ambiente real. Testes locais não criam esses recursos externos.

Defina a origem pública exata, por exemplo `AUTH_ORIGIN=https://app.ateliemilenakerbage.com.br`. Requisições de autenticação de outras origens são rejeitadas. Sem uma origem HTTPS configurada, operações de autenticação em produção falham de forma fechada.

## Banco de produção: Supabase e Vercel

1. Crie ou selecione o projeto Supabase autorizado. Separe homologação e produção para que testes e previews não utilizem dados reais por engano.
2. Aplique as sete migrações de `supabase/migrations/`, em ordem: `001_auth.sql`, `002_whatsapp.sql`, `003_meta_deletion.sql`, `004_integration_settings.sql`, `005_integration_manager.sql`, `006_erp.sql` e `007_workspace_access.sql`. As tabelas PostgreSQL não são criadas automaticamente por uma requisição ao aplicativo.
3. No painel **Connect** do Supabase, obtenha a conexão apropriada ao ambiente serverless. A orientação oficial é usar o pooler em modo de transação para funções serverless. Copie host, porta, usuário e demais dados do projeto; não construa esses valores por suposição. Consulte [conexões PostgreSQL no Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres).
4. Configure `DATABASE_URL` como variável privada no projeto Vercel. Nunca use `NEXT_PUBLIC_DATABASE_URL`, uma chave `anon` ou uma publishable key como substituto da conexão PostgreSQL. A URL contém uma credencial e deve permanecer no ambiente do servidor.
5. Configure `AUTH_ORIGIN` com a origem HTTPS exata. Separe as variáveis de Production, Preview e Development; faça redeploy depois de alterações.
6. Defina `ERP_ADMIN_EMAILS` com o e-mail real autorizado antes da atribuição inicial de papel. Crie a conta inicial com o procedimento abaixo, usando a conexão do ambiente correto. Valide login, revogação, recuperação e persistência entre invocações antes de cadastrar operadores reais.

O esquema `erp_auth` contém:

| Tabela | Dados e finalidade |
| --- | --- |
| `users` | ID, e-mail normalizado, nome e hash da senha; não guarda senha em texto |
| `sessions` | SHA-256 do token de sessão, usuário, expiração absoluta e última atividade |
| `resets` | SHA-256 do token de recuperação, usuário, expiração e referência da versão da senha |
| `attempts` | Chave do limitador, contador e término da janela de tentativas |
| `members` | Papel, situação, função, dados de perfil e data de ingresso |
| `invitations` | Hash de ativação, conta, expiração e criação |
| `api_keys` | Hash da chave, escopo, pessoa emissora, prefixo, final e último uso |
| `profile_photos` | Binário de imagem validado, tipo e atualização |
| `app_webhooks` / `webhook_deliveries` | Destinos autorizados, segredo criptografado e fila de eventos/entregas |
| `notification_states` / `access_audit` | Leitura/arquivamento por pessoa e auditoria administrativa sem segredos |

As migrações habilitam RLS e revogam acesso de `PUBLIC`, `anon` e `authenticated`. O esquema deve ficar fora dos esquemas expostos pela Data API do Supabase. O servidor utiliza uma conexão administrativa autorizada apropriada ao esquema; a credencial não é enviada ao navegador. Um papel limitado sem permissão ou sem política RLS adequada não poderá operar essas tabelas. Não libere os papéis públicos para contornar falhas de login. Consulte [RLS no Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

O driver `pg` compartilha um pool de **uma conexão por instância do aplicativo**. Cada operação utiliza uma transação e `SET LOCAL search_path` para selecionar o domínio. Transações mantêm o mesmo cliente por meio de `AsyncLocalStorage`; não dependem de estado de sessão entre requisições do pooler nem de prepared statements nomeados. Os esquemas de WhatsApp, protocolos Meta e operações do ERP são separados, respectivamente `erp_whatsapp`, `erp_meta` e `erp_core`.

TLS é obrigatório no caminho de produção, com validação do certificado. `DATABASE_SSL_CA` pode fornecer a CA PEM do projeto, quando necessária; sem esse campo, o driver usa a cadeia confiável do runtime. Parâmetros `sslmode`, `sslcert`, `sslkey` e `sslrootcert` da URL são retirados para não enfraquecer a configuração explícita do driver. Não resolva problemas de certificado desabilitando sua verificação. `DATABASE_SSL_MODE=disable` só é aceito em `NODE_ENV=test`, fora da Vercel, com host de loopback para o teste PostgreSQL local; não é uma opção de implantação.

`DATABASE_URL`, `DATABASE_SSL_CA`, credenciais SMTP e quaisquer outros segredos não devem aparecer em commit, logs, captura de tela, ticket, diretório `public/` ou código de frontend. `.env.example` é um modelo com os campos de segredo vazios. Use variáveis sensíveis do provedor e um cofre autorizado para distribuição. Backups, restauração, controle de acesso e retenção no Supabase precisam ser configurados e testados pelo responsável pela instalação.

## Conta inicial

Antes do comando, aplique a migração e configure a conexão privada do banco de destino. Na Vercel, não dependa de executar um terminal interativo dentro de uma função serverless: use um terminal administrativo autorizado para acessar o mesmo PostgreSQL.

Dentro do projeto, utilize `.env.local`, ignorado pelo Git, com `DATABASE_URL` do destino e a configuração TLS necessária, ou variáveis já disponibilizadas pelo ambiente seguro. O script `auth:create-user` carrega `.env.local` automaticamente. O comando não recebe a senha do banco nem a senha do usuário como argumento:

```sh
npm run auth:create-user -- admin@ateliemilenakerbage.com.br
```

O e-mail acima é um exemplo de destino administrativo; utilize o endereço real autorizado. Informe o nome e a senha nos prompts. A senha do usuário não aparece no terminal, não é passada como argumento e não é salva em arquivos ou variáveis de ambiente. Exige de 8 a 128 caracteres, incluindo letras, números e símbolos. O comando não substitui contas existentes. Depois de ativar a administração, prefira Configurações → Usuários para convidar a equipe por link de ativação real. Não há envio automático de convite por e-mail.

**Confira o destino antes de executar:** sem `DATABASE_URL`, fora da Vercel, o comando usa o SQLite local. Isso não cria uma conta no Supabase. Não cole uma URL com senha em um comando de shell nem publique o conteúdo de `.env.local`. Uma instalação PostgreSQL vazia também não importa automaticamente contas já existentes em SQLite; uma migração de dados reais exige procedimento separado, protegido e verificado.

## SQLite local

Sem `DATABASE_URL` em desenvolvimento/testes fora da Vercel, o banco é `.data/auth.sqlite` (diretório privado, arquivo com permissão 0600), ignorado pelo Git e pelo rastreamento do build. `AUTH_DB_PATH` seleciona outro arquivo **local**. Essa variável não substitui `DATABASE_URL` na produção escolhida. Não copie o banco para `public/`, para o repositório nem para o pacote de frontend. Se ele contiver dados reais, mantenha backups protegidos e acesso restrito.

## Recuperação de senha por e-mail

Configure no ambiente do servidor, fora do código e sem prefixo `NEXT_PUBLIC_`:

```text
AUTH_ORIGIN=https://app.ateliemilenakerbage.com.br
SMTP_HOST=servidor-smtp-do-provedor
SMTP_PORT=587
SMTP_USER=usuario-do-provedor
SMTP_PASSWORD=credencial-do-provedor
SMTP_FROM=Ateliê Milena Kerbage <nao-responda@ateliemilenakerbage.com.br>
```

São aceitas as portas 587 (STARTTLS obrigatório) e 465 (TLS). O certificado é validado. O remetente precisa estar autorizado no provedor. Nenhuma configuração real de SMTP foi fornecida nesta tarefa: o envio real ainda precisa ser configurado e testado. Sem configuração, a tela informa indisponibilidade e não simula envio.

O envio é agendado com `after()` do Next.js, depois da mesma resposta genérica tanto para e-mail cadastrado quanto inexistente. Falhas de envio produzem apenas um registro genérico no servidor. Tokens aleatórios de 256 bits ficam armazenados somente como SHA-256, expiram em 20 minutos e funcionam uma vez. O token vai no fragmento do link, não na query; a tela retira-o da URL e envia-o via POST ao redefinir. A redefinição revoga todas as sessões. Para alta confiabilidade de entrega, use uma fila de e-mail durável; `after()` não reenvia automaticamente se o processo for encerrado durante o envio.

## Proteções implementadas e revisão

- Hash scrypt com salt aleatório por senha, N=131072, r=8, p=1; no máximo dois cálculos simultâneos por processo. Comparação em tempo constante e mesmo custo de hash para contas inexistentes.
- Sessão opaca aleatória de 256 bits: só o hash é armazenado no banco. Cookies HttpOnly, SameSite=Lax, caminho `/`; Secure e prefixo `__Host-` em produção. Sem prazo persistente no cookie. Validade absoluta de 8 horas e inatividade de 30 minutos no servidor. Navegação renderizada e mutações autenticadas renovam a atividade; polling automático de status/conversas/mensagens **não** renova esse prazo.
- Proxy valida sessões em cada requisição a páginas internas, inclusive navegação RSC/prefetch, sem renovar a atividade. O layout interno valida novamente. APIs autenticadas verificam a sessão no próprio handler; futuras APIs e Server Actions devem usar a mesma validação próxima dos dados. Erros de banco na validação retornam indisponibilidade sanitizada, sem divulgar URL de conexão ou credenciais.
- Logout apaga a sessão no banco e expira o cookie; copiar o cookie anterior não permite reutilizá-lo. Troca de senha exige a senha atual, mantém uma nova sessão e revoga as anteriores. Transações protegem alteração de senha, emissão de sessão e consumo único da recuperação. No PostgreSQL, o registro do usuário é bloqueado com `SELECT … FOR UPDATE` nos pontos de validação concorrente; no SQLite, a transação imediata serializa escritores. Veja [bloqueios de linha no PostgreSQL](https://www.postgresql.org/docs/current/explicit-locking.html).
- Limites persistentes: 5 tentativas de login por e-mail a cada 15 minutos; limite global de 60 por ação/15 minutos. Recuperação: 3 por e-mail e 15 globais/15 minutos. Redefinição e alteração de senha também têm limites. Cabeçalhos de IP enviados pelo cliente não são usados como identidade confiável.
- Consultas SQL parametrizadas, limite de corpo de autenticação de 4 KiB, validação no servidor, checagem de Origin e rejeição de chamadas cross-site. Login, logout, recuperação e alterações de senha usam POST; GET não realiza essas mutações. As consultas GET privadas do WhatsApp também exigem sessão válida.
- Sem armazenamento de senha em cookies, localStorage, sessionStorage ou logs. Campos indicam `autocomplete=off` e são limpos após envio. Um navegador ou gerenciador de senhas pode ignorar essa indicação; o aplicativo não consegue proibir o usuário de guardar uma senha.
- Cabeçalhos contra enquadramento, detecção indevida de conteúdo e vazamento de Referer; HSTS em produção. Não substituem sanitização e revisão de todas as telas.

Limitações relevantes: o limite global pode ser esgotado e bloquear logins legítimos temporariamente; a proteção adicional por IP deve usar a infraestrutura confiável do ambiente publicado. Na Vercel, o PostgreSQL compartilhado mantém sessões e limitadores entre instâncias; a disponibilidade continua dependendo do banco, do pooler e do provedor. HTTPS real, migrações, rede e configuração de infraestrutura ainda dependem da implantação.

## Papéis, equipe e credenciais do ERP

Para uma conta existente que já recebeu papel, o responsável técnico pode executar `npm run erp:authorize-admin -- email-real`, com o e-mail autorizado em `ERP_ADMIN_EMAILS` e o banco de destino correto. O comando promove o papel persistido e revoga as sessões anteriores; depois, faça login novamente. Não recebe senha como argumento.

O servidor atribui e persiste os papéis `admin`, `manager` e `member` em `erp_auth.members`. Na primeira atribuição de uma conta sem papel, `ERP_ADMIN_EMAILS` concede `admin` aos e-mails nela autorizados; as demais contas recebem `member`. A variável é um bootstrap e não substitui um papel já persistido. O perfil da própria pessoa não altera sua permissão. A administração pode gerenciar outras contas, mas o servidor impede desativar a própria conta e remover a última administração ativa.

Rotas de usuários, criação/revogação de chaves, gestão de webhooks, funis e preferências exigem as permissões conferidas no servidor. Relatórios e financeiro exigem administração ou gestão. Operadores usam as operações do CRM e dos módulos permitidos; a descrição completa está no [manual do backend](erp-backend.md). O frontend não usa permissões de mocks nem escolhe `admin` para a pessoa logada.

A administração cria um convite real em Configurações → Usuários. O servidor cadastra a conta como `invited`, emite um token aleatório, guarda somente seu hash e devolve um link para compartilhar em particular. Esse link vale por sete dias, usa fragmento em `/convite` e é consumido uma vez quando a pessoa define sua senha. O sistema não afirma ter enviado um e-mail. Contas pendentes ou desativadas não podem operar o ERP; desativação e mudanças de permissão revogam sessões e chaves da conta conforme o fluxo administrativo. A administração vê as contas desativadas e pode reativar uma conta que já concluiu a ativação. Para uma conta ainda pendente, use Reemitir convite: o servidor invalida o link anterior e fornece um novo link privado, sem envio automático de e-mail. O servidor impede ativar uma conta pendente pela simples alteração de status e mantém a proteção da última administração ativa.

Perfil, telefone e função são persistidos. Pessoas com papel `member` ou `manager` não podem alterar o próprio e-mail de acesso: o campo é somente leitura na interface e a restrição também é conferida pelo servidor. Solicite essa mudança à administração, que pode gerenciar os e-mails das contas. Essa proteção impede obter acesso à gestão WhatsApp trocando o e-mail por um endereço da allowlist. Fotos JPG, PNG ou WebP de até 3 MiB são validadas no servidor e guardadas como binário no banco; o navegador lê o arquivo por uma rota autenticada. Anexos das fichas do CRM também usam upload real e leitura autenticada, sem guardar URLs `blob:` como se fossem arquivos permanentes.

Chaves do ERP são emitidas somente pela administração. O valor completo aparece uma vez, e somente seu hash e metadados são guardados para autenticação. Escopos `read` e `write` valem nas rotas que aceitam explicitamente `Authorization: Bearer`; o papel da conta emissora continua sendo validado e a chave não autentica `/api/whatsapp` nem os endpoints administrativos que exigem sessão. Os segredos de webhooks são criptografados e também exibidos uma vez. A interface preserva o valor recebido na criação mesmo se a atualização da listagem falhar.

A gestão da integração WhatsApp tem uma autorização separada por `INTEGRATION_MANAGER_EMAILS`, além da sessão, Origin e limites. Conferir o papel do ERP não dispensa essa lista. MFA permanece indisponível; a interface não simula proteção de duas etapas. Conectores de outros provedores e automações sem executor continuam indicados como pendentes.

## Verificação

```sh
npm run typecheck
npm run test:auth
npm run test:erp
npm run test:postgres
npm run build
```

`npm run test:auth` usa SQLite temporário isolado e cobre política de senha, hash/salt, sessões expiradas/forjadas/revogadas, polling sem renovação de atividade, limites, recuperação única, resets concorrentes, troca de senha, rollback e SQL injection. A suíte desconsidera `DATABASE_URL` e `VERCEL` para evitar acesso acidental a um banco remoto.

`npm run test:postgres` inicia um motor PostgreSQL local em WASM e usa o protocolo e driver `pg`. Aplica as sete migrações, verifica esquemas privados/RLS e exercita autenticação, recuperação, limitadores e rollback, além da integração WhatsApp e dos protocolos Meta. Suas credenciais fictícias e a dispensa de TLS no loopback pertencem somente ao teste. Essa verificação não valida a conexão TLS, a região, o plano ou a disponibilidade de uma conta Supabase real.

Para os testes HTTP de autenticação, use uma instância com login obrigatório e banco de teste separado. `AUTH_TEST_ORIGIN` é a URL local do servidor de teste; `AUTH_ORIGIN` corresponde à origem exigida pelo backend. O processo do teste e o servidor devem acessar o **mesmo banco isolado**. `npm run test:auth:http` cria somente uma conta aleatória temporária e remove essa conta ao terminar. Não execute esses testes contra a produção real. A criação da conta e as consultas ao banco são assíncronas.

As suítes devem conferir login, logout, recuperação por token, proteção de rotas, cookies, CSRF/Origin, papéis, convites, chaves, mensagens genéricas e rate limiting, além das migrações com o driver PostgreSQL no motor local. Registre o resultado da rodada final antes de declarar a instalação validada. A conta Supabase, a implantação Vercel e a recuperação SMTP reais permanecem pendentes de configuração e validação conforme o checklist de implantação. Esses testes não representam certificação nem teste de invasão completo.
