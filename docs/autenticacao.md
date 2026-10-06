# Autenticação do Ateliê

O login é validado em Route Handlers do Next.js. As telas, dados de demonstração e componentes existentes continuam disponíveis. Não há senha padrão nem credenciais embutidas no código.

## Desenvolvimento e produção

- `npm run dev`: páginas internas liberadas por padrão, usando o perfil demonstrativo. `/login` continua disponível para conferir a tela.
- `AUTH_REQUIRE_LOGIN=true npm run dev`: exige autenticação também localmente, para testes.
- `npm run build` seguido de `npm run start`: exige login sempre. `AUTH_REQUIRE_LOGIN=false` nunca libera produção.
- Requer Node.js 22.13 ou posterior. Execute com HTTPS em produção, em uma instância Node com disco persistente. Não use este SQLite em armazenamento efêmero de funções serverless.

Defina a origem pública exata, por exemplo `AUTH_ORIGIN=https://app.ateliemilenakerbage.com.br`. Requisições de autenticação de outras origens são rejeitadas. Sem uma origem HTTPS configurada, operações de autenticação em produção falham de forma fechada.

## Conta inicial

No terminal do servidor, dentro do projeto:

```sh
npm run auth:create-user -- admin@ateliemilenakerbage.com.br
```

Informe o nome e a senha nos prompts. A senha não aparece no terminal, não é passada como argumento e não é salva em arquivos ou variáveis de ambiente. Exige de 8 a 128 caracteres, incluindo letras, números e símbolos. O comando não substitui contas existentes. Para novos usuários, execute novamente com o e-mail desejado; os convites da tela de equipe continuam demonstrativos e não criam credenciais reais.

O banco é `.data/auth.sqlite` (diretório privado, arquivo com permissão 0600), ignorado pelo Git e pelo rastreamento do build. Para uma instalação em volume persistente, configure `AUTH_DB_PATH` no servidor. Faça backups protegidos: o banco contém e-mails, hashes e sessões. Não copie este banco para `public/`, para o repositório nem para o pacote de frontend.

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
- Sessão opaca aleatória de 256 bits: só o hash é armazenado no banco. Cookies HttpOnly, SameSite=Lax, caminho `/`; Secure e prefixo `__Host-` em produção. Sem prazo persistente no cookie. Validade absoluta de 8 horas e inatividade de 30 minutos no servidor.
- Proxy valida sessões em cada requisição a páginas internas, inclusive navegação RSC/prefetch. O layout interno valida novamente. APIs autenticadas verificam a sessão no próprio handler; futuras APIs e Server Actions devem usar a mesma validação próxima dos dados.
- Logout apaga a sessão no banco e expira o cookie; copiar o cookie anterior não permite reutilizá-lo. Troca de senha exige a senha atual, mantém uma nova sessão e revoga as anteriores. Transações evitam criar sessões com hashes antigos durante trocas concorrentes.
- Limites persistentes: 5 tentativas de login por e-mail a cada 15 minutos; limite global de 60 por ação/15 minutos. Recuperação: 3 por e-mail e 15 globais/15 minutos. Redefinição e alteração de senha também têm limites. Cabeçalhos de IP enviados pelo cliente não são usados como identidade confiável.
- Consultas SQL parametrizadas, limite de corpo de 4 KiB, validação no servidor, checagem de Origin, rejeição de chamadas cross-site e ausência de autenticação em métodos GET.
- Sem armazenamento de senha em cookies, localStorage, sessionStorage ou logs. Campos indicam `autocomplete=off` e são limpos após envio. Um navegador ou gerenciador de senhas pode ignorar essa indicação; o aplicativo não consegue proibir o usuário de guardar uma senha.
- Cabeçalhos contra enquadramento, detecção indevida de conteúdo e vazamento de Referer; HSTS em produção. Não substituem sanitização e revisão de todas as telas.

Limitações relevantes: o limite global pode ser esgotado e bloquear logins legítimos temporariamente; para publicação, acrescente proteção por IP no proxy reverso confiável. Várias instâncias precisam compartilhar banco e limitador adequados, em vez de arquivos SQLite independentes. HTTPS real e configuração de infraestrutura ainda dependem do ambiente de publicação. As permissões, integrações, convites, alterações de perfil e a opção de duas etapas das telas antigas ainda são demonstrações; não representam autorização por papel ou MFA no backend. A autenticação implementada não transforma essas demonstrações em serviços reais.

## Verificação

```sh
npm run typecheck
npm run test:auth
npm run build
```

`npm run test:auth` usa banco temporário isolado e cobre política de senha, hash/salt, sessões expiradas/forjadas/revogadas, limites, uso único de recuperação, concorrência de troca e SQL injection. Para os testes HTTP, use uma instância com login obrigatório e banco de teste separado. `AUTH_TEST_ORIGIN` é a URL local do servidor de teste; `AUTH_ORIGIN` corresponde à origem exigida pelo backend. `npm run test:auth:http` cria somente uma conta aleatória temporária e remove essa conta ao terminar. Não execute esses testes contra a produção real.

Foram conferidos login, logout, recuperação por token, proteção de rotas, cookies, CSRF/Origin, mensagens genéricas e rate limiting em uma instância local de produção. Isso é uma revisão básica, não uma certificação nem um teste de invasão completo.
