# Backend do ERP e consumo das APIs

Atualizado em 12 de outubro de 2026. Aplicação: Ateliê Milena Kerbage.

O ERP passou a persistir CRM, configurações, contas e oito módulos operacionais no servidor. As telas usam os resultados das APIs. Nenhuma cliente, venda, mensagem ou pagamento de exemplo é incluído no banco inicial. Três funis e a configuração empresarial conhecida são criados no primeiro acesso para permitir o trabalho.

A implementação usa o mesmo adaptador em SQLite local e PostgreSQL/Supabase. Os testes usam bancos temporários ou PostgreSQL local em PGlite pelo protocolo `pg`; isso não cria nem confirma conexão com a conta Supabase real. Vercel, Supabase, DNS, certificados, backups e credenciais externas continuam sob preparação do responsável pela implantação.

O guia de operação da interface está em [erp-operacao.md](erp-operacao.md), e a autenticação em [autenticacao.md](autenticacao.md). WhatsApp e Meta possuem contratos próprios em [whatsapp-meta.md](whatsapp-meta.md). O gestor baixa os documentos pela tela API e webhooks, pela ajuda ou em `/api/erp/documentation`.

## 1. Preparação e banco

Aplicar, em ordem, as sete migrações de `supabase/migrations`:

| Migração | Conteúdo |
| --- | --- |
| `001_auth.sql` | Usuários, sessões, recuperação e limitador |
| `002_whatsapp.sql` | Contatos, mensagens, eventos, autorização, supressão e envios |
| `003_meta_deletion.sql` | Protocolos de revisão de exclusão Meta |
| `004_integration_settings.sql` | Configuração cifrada da integração |
| `005_integration_manager.sql` | Checklist, testes e estado OAuth |
| `006_erp.sql` | CRM, notas/anexos, funis, preferências, registros e auditoria |
| `007_workspace_access.sql` | Papéis, convites, chaves, fotos, webhooks e notificações |

Os esquemas privados são `erp_auth`, `erp_whatsapp`, `erp_meta` e `erp_core`. As tabelas têm RLS habilitada; `PUBLIC`, `anon` e `authenticated` não recebem acesso público. Os esquemas devem permanecer fora da Data API pública do Supabase. O servidor utiliza uma conexão privilegiada autorizada aos esquemas. O papel da conexão e seus privilégios precisam ser conferidos no projeto real.

Variáveis privadas:

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | Conexão ao transaction pooler Supabase, copiada do painel Connect |
| `DATABASE_SSL_CA` | CA PEM quando necessária para verificar TLS |
| `AUTH_ORIGIN` | Origem exata do sistema; HTTPS obrigatório na produção |
| `AUTH_REQUIRE_LOGIN=true` | Exigir login também no desenvolvimento local |
| `ERP_ADMIN_EMAILS` | Bootstrap de e-mails reais de administradores antes do primeiro acesso |
| `INTEGRATION_MANAGER_EMAILS` | Allowlist adicional para gestão da integração Meta |
| `INTEGRATION_ENCRYPTION_KEY` | 32 bytes aleatórios em base64; preservar para decifrar segredos existentes |
| `ERP_WEBHOOK_ALLOWED_HOSTS` | Hosts HTTPS exatos autorizados para saída de webhooks, separados por vírgula |
| `ERP_DB_PATH` | Arquivo SQLite do ERP somente no ambiente local |

O pool `pg` compartilha uma conexão por instância. Cada operação usa uma transação e `SET LOCAL search_path`. Consultas usam parâmetros, sem prepared statements nomeados. TLS verifica o servidor; nenhuma dispensa de certificado é permitida na produção. Na Vercel, faltar `DATABASE_URL` provoca erro: não há fallback para SQLite efêmero.

No desenvolvimento, os arquivos ficam em `.data`, com acesso privado e fora do Git e do pacote. `.env.local` não é incluído no rastreamento de produção. Chaves e senhas não usam `NEXT_PUBLIC_`. Nenhuma senha de acesso é documentada neste arquivo.

## 2. Conta inicial, convites e papéis

Configure os e-mails administrativos antes do primeiro login, crie a conta no banco correto com `npm run auth:create-user -- email-real`, digitando a senha no prompt oculto. O script carrega `.env.local`. Se a conta já entrou como membro e precisa do bootstrap administrativo, use `npm run erp:authorize-admin -- email-real`; o e-mail precisa estar autorizado em `ERP_ADMIN_EMAILS`. O comando registra a autorização e revoga sessões para exigir novo login.

Depois da criação do papel persistido, alterações usam a tela de equipe. A variável de bootstrap não reverte automaticamente uma despromoção deliberada. Corrigir variáveis locais não cria uma conta equivalente no Supabase: é preciso provisionar o destino correto.

| Papel | Permissões principais |
| --- | --- |
| `admin` | Equipe, configuração, chaves, webhooks e operação do ERP |
| `manager` | Operação e financeiro/relatórios; sem administração da equipe/configuração |
| `member` | CRM e operação; sem financeiro/relatórios nem gestão de acesso |

Todo handler ERP verifica sessão real ou chave Bearer explicitamente permitida. O preview de desenvolvimento de outros módulos não autentica essas APIs. Papéis não vêm do navegador. Mutações de sessão validam `Origin`; cabeçalhos forjados de IP não concedem identidade. Polling de leitura não renova a inatividade da sessão.

Convites criam uma conta sem senha conhecida, com estado `invited`, e um token aleatório guardado somente como SHA-256. O link privado tem `/convite#token`; o fragmento é retirado do endereço ao abrir e enviado por POST. A validade é sete dias e o uso é único. A entrega nesta versão é manual: a interface mostra o link, sem fingir envio de e-mail. Reemissão invalida o anterior. Aceite, reemissão e alterações de equipe compartilham um bloqueio transacional no PostgreSQL para impedir que uma reemissão concorrente coloque novamente em convite uma conta que acabou de ser ativada. Cancelar convite remove tokens; uma conta nunca ativada precisa concluir novo convite antes de ficar ativa.

Desativar uma pessoa preserva cadastro e histórico, mas revoga sessões e chaves. Administração pode reativar uma conta já ativada. O perfil próprio não modifica permissão. O servidor impede desativar a própria conta ou remover a última administração ativa. Mudança de e-mail de acesso exige administração; equipe e gestão não alteram o próprio e-mail, preservando a autorização adicional da integração. O envio do mesmo endereço é aceito. Uma alteração administrativa invalida os links de recuperação antigos. Nome, telefone, função, foto e última entrada exibidos vêm do servidor.

## 3. Catálogo de rotas

`GET /api/erp` fornece catálogo, recursos e modo de armazenamento. O endereço base local depende de `AUTH_ORIGIN`; a origem planejada de produção é `https://app.ateliemilenakerbage.com.br`. Publicação desse endereço ainda depende de DNS, Vercel e HTTPS reais.

| Rota | Métodos | Finalidade |
| --- | --- | --- |
| `/api/erp/workspace` | GET | Funis, preferências, equipe e perfil |
| `/api/erp/leads` | GET, POST | Lista e cadastro de lead |
| `/api/erp/leads/{id}` | GET, PATCH, DELETE | Ficha, edição, arquivo/restauração |
| `/api/erp/leads/{id}/notes` | POST | Nota interna, autoria e anexos |
| `/api/erp/leads/{id}/attachments` | POST | Upload multipart `file` |
| `/api/erp/leads/{id}/attachments/{attachmentId}` | GET, DELETE | Download privado e remoção |
| `/api/erp/funnels` | GET, POST | Funis e etapas |
| `/api/erp/funnels/{id}` | GET, PATCH, DELETE | Funil individual e configuração |
| `/api/erp/funnels/reorder` | POST | Ordenação completa |
| `/api/erp/preferences` | GET, PATCH | Preferências com revisão |
| `/api/erp/records/{resource}` | GET, POST | Registros operacionais |
| `/api/erp/records/{resource}/{id}` | GET, PATCH, DELETE | Consulta, edição e arquivo/restauração |
| `/api/erp/reports` | GET | Agregados calculados do banco |
| `/api/erp/team` | GET, POST | Equipe e convite |
| `/api/erp/team/{id}` | PATCH, DELETE | Papel, reativação e desativação |
| `/api/erp/team/{id}/invite` | POST | Reemissão de convite |
| `/api/erp/profile` | GET, PATCH | Próprio perfil |
| `/api/erp/profile/photo` | GET, POST, DELETE | Foto persistida |
| `/api/erp/api-keys` | GET, POST | Metadados e emissão de chave |
| `/api/erp/api-keys/{id}` | DELETE | Revogação |
| `/api/erp/webhooks` | GET, POST | Endpoints e assinaturas |
| `/api/erp/webhooks/{id}` | PATCH, DELETE | Alteração e remoção |
| `/api/erp/webhooks/{id}/test` | POST | Evento real de teste |
| `/api/erp/webhooks/deliveries` | GET, POST | Histórico e nova tentativa |
| `/api/erp/notifications` | GET, PATCH | Eventos reais e escolhas por usuário |
| `/api/erp/documentation` | GET | Manual técnico; `document=operation` para operação |
| `/api/auth/accept-invitation` | POST | Ativar conta com token/senha |

Login, logout, troca/recuperação de senha continuam em `/api/auth/{action}`. APIs WhatsApp permanecem em `/api/whatsapp`; seus callbacks públicos verificam assinatura/token no próprio handler. Métodos não suportados retornam 405. Rotas de API inexistentes retornam JSON 404 após o controle de acesso, quando exigido; sem sessão, o gate privado pode responder 401 antes da resolução da rota. Uma página desconhecida usa o `not-found` do Next.js, que pode responder HTTP 200 quando o streaming já iniciou, preservando a página de erro semântico 404.

## 4. Autenticação de consumidores

Chaves são emitidas em Configurações → API e webhooks. O valor `mk_live_...` aparece uma vez; só SHA-256 e metadados ficam no banco. Revogar tem efeito no servidor. Desativação ou mudança de papel do emissor revoga suas chaves; em cada uso, a conta precisa estar ativa.

Enviar `Authorization: Bearer <chave>` somente do servidor autorizado. `read` permite consultas; `write` acrescenta mutações elegíveis. O papel do emissor continua sendo conferido. Rotas elegíveis: catálogo, CRM/leads/notas, registros operacionais e relatórios. Financeiro e relatórios exigem administração/gestão. Perfil, equipe, emissão de chaves, arquivos, preferências e webhooks exigem sessão; chave de dados não administra acesso. A chave ERP não autentica as APIs WhatsApp.

As requisições JSON usam `application/json`; o limite geral é 64 KiB. Sessões usam cookies HttpOnly/SameSite. A API não libera CORS genérico para colocar chaves em sites públicos. O formulário externo deve chamar seu próprio backend, que utiliza a chave privada.

## 5. CRM e revisões

Cadastro: `POST /api/erp/leads` com `{lead:{name,phone,budget,funnelId,stage,tags},details?:{email,source,...}}`. IDs e datas são gerados no servidor. Telefone tem 8–15 dígitos após normalização, DDD ou DDI; isso não valida propriedade do número nem registra permissão WhatsApp.

A resposta inclui `lead.revision`. Edição usa `PATCH /api/erp/leads/{id}` com `{revision,lead?:{campos},details?:{campos},status?:"open"|"progress"|"resolved"}`. O histórico é atribuído à identidade do servidor. Cliente não sobrescreve histórico ou a lista de anexos. O responsável precisa corresponder a uma conta ativa. Funil/etapa precisam existir.

Exemplo de edição:

```json
{"revision":1,"lead":{"stage":"contato"},"details":{"source":"Atendimento presencial"}}
```

Versão antiga retorna 409 `REVISION_CONFLICT`. Atualize e reaplique uma decisão consciente. DELETE exige `?revision=N` e arquiva; `PATCH {revision,restore:true}` restaura. Referências operacionais impedem arquivar o cliente enquanto houver registros ativos vinculados. Arquivar preserva dados; não é a eliminação LGPD.

Notas internas usam `{text,attachmentIds?}`. Elas não fingem envio nem entram como resposta WhatsApp. Envios reais continuam na caixa WhatsApp, sujeitos a conta configurada, consentimento, janela e modelo aprovado. Um telefone na ficha não cria automaticamente vínculo de identidade confirmado entre todos os sistemas.

Listas aceitam paginação explícita `limit=1..500`, `offset=0..1000000`, com `pagination:{limit,offset,total,hasMore}`. Omitir `limit` mantém o snapshot completo necessário aos consumidores existentes. `archived=false|true|all|only` é validado. Consultas individuais podem incluir registros arquivados quando solicitado. Para grande volume, consumidores devem paginar; a tela operacional carrega páginas adicionais.

Funis preservam ao menos um item. Uma etapa/funil em uso por leads ativos ou arquivados não é removida. Reordenação informa todos os IDs uma vez e a revisão do workspace. Preferências atualizam somente campos permitidos, com revisão; o servidor valida e-mail, telefone, fuso, horários, valores e enumerações.

## 6. Recursos operacionais

Os recursos são `agenda`, `orcamentos`, `pedidos`, `catalogo`, `producao`, `materiais`, `movimentacoes` e `financeiro`. POST recebe `{record:{campos}}`; PATCH `{revision,record:{campos}}`; arquivamento exige versão e restauração usa `{revision,restore:true}`. Campos/status disponíveis estão em `src/lib/erp/types.ts` e no guia operacional. Campos desconhecidos, datas inválidas, números inadequados e vínculos inconsistentes são rejeitados antes da gravação.

- Agenda: início/fim com fuso, término posterior ao início, cliente opcional, local e situação. A tela não finge sincronização com Google Agenda nem envio automático de lembrete.
- Orçamento: itens com descrição, quantidade e preço unitário, desconto, validade e situação. Total é calculado em centavos no servidor; não aceita total inventado pelo cliente.
- Pedido: cliente, orçamento opcional, situação, prazo e valor contratado. Ao vincular orçamento, ele precisa estar aceito e pertencer à cliente; seu total é copiado. Revisar o orçamento depois não muda silenciosamente o valor do pedido. Alterar o orçamento associado exige novo orçamento aceito.
- Catálogo: nome, SKU, categoria, preço, descrição e disponibilidade. SKU duplicado no módulo é rejeitado, desconsiderando caixa.
- Produção: pedido existente, tarefa, responsável registrado em texto, prazo, prioridade e etapa. A atribuição dessa ficha é informativa; não concede permissão de conta.
- Materiais: unidade, custo e mínimo. Saldo começa em zero e é derivado de movimentações; não é editado diretamente. Unidade em uso não muda arbitrariamente.
- Movimentação: material, direção, quantidade, custo, data e motivo. Registro é imutável; correção utiliza estorno por arquivamento e uma nova movimentação. Estorno/restauração modifica o saldo atomicamente e não pode deixá-lo negativo. Escritores concorrentes são serializados no PostgreSQL pelo mesmo bloqueio usado no core ERP.
- Financeiro: receita/despesa, valor positivo, vínculo opcional, vencimento, categoria e situação. Uma baixa exige data e estado coerentes. O lançamento registra o controle interno; não executa transferência, cobrança bancária ou emissão fiscal.

IDs de cliente/pedido/orçamento/material são validados. Não é possível trocar o cliente de um documento e quebrar silenciosamente registros filhos. Arquivar um pai com filhos ativos é bloqueado. Estoque e transações fazem rollback em caso de erro. Pedidos de direitos devem localizar também fichas, notas, arquivos, vínculos comerciais e auditoria do ERP. A exclusão WhatsApp não realiza essa eliminação automaticamente; o gestor deve registrar o alcance, providências e eventual conservação justificada antes de encerrar o pedido. A política pública de privacidade descreve as categorias e o procedimento separado. Anexos usam o mesmo bloqueio do core para não serem gravados numa ficha arquivada concorrentemente.

Relatórios calculam receitas/despesas realizadas e pendentes, vencidos, fluxo mensal, saldo, mínimos de estoque, valor do estoque, quantidade de leads, funis e origens. `from`/`until` filtram o financeiro por baixa para pagos ou vencimento para pendentes. CRM, estoque e contagens operacionais mostram o estado atual, sem inventar uma série histórica. Cancelados/arquivados não compõem valores ativos. Conferência com comprovantes permanece responsabilidade operacional.

## 7. Arquivos, fotos e notificações

Uploads usam multipart com `file`, limite de 3 MiB por arquivo. Anexo de ficha aceita `duration` opcional. Há limite de 100 arquivos/30 MiB por lead. Binários são guardados em BLOB local ou BYTEA PostgreSQL; não dependem de disco efêmero da Vercel. Fotos aceitam PNG/JPEG/WebP com verificação inicial de assinatura; SVG é rejeitado. URLs autenticadas substituem `blob:` temporário.

Download de anexo exige sessão, verifica a ficha e responde como attachment/octet-stream/nosniff. Fotos da equipe ativa são privadas ao sistema. Arquivar ficha restringe o download até restauração. Remoção de arquivo elimina o binário; backups do provedor precisam procedimento próprio. Para volumes maiores, avaliar migração protegida para object storage e sua autorização; a versão atual não finge esse serviço.

Notificações são derivadas da auditoria de operações efetivamente gravadas. Leitura e arquivo pertencem a cada pessoa, com estado persistido; dados financeiros são filtrados pelo papel. São consultadas no carregamento, nas mudanças do ERP e ao abrir o painel. Não são push/email de fundo. Preferências de automações sem executor externo disponível permanecem identificadas na interface.

## 8. Webhooks de saída

Cadastro administrativo aceita URL HTTPS pública na porta 443, sem userinfo, IP literal ou fragmento. O host precisa estar autorizado exatamente em `ERP_WEBHOOK_ALLOWED_HOSTS` para entrega. DNS é validado e fixado à conexão TLS; redes privadas, locais e reservadas são rejeitadas. Certificado é verificado e redirects não são seguidos. O segredo HMAC fica cifrado com AES-GCM e AAD do endpoint, usando a chave privada da instalação.

Eventos: `lead.created`, `lead.stage_changed`, `conversation.resolved`, `message.received`, `message.sent`. Mensagens são eventos reais WhatsApp; notas internas não se passam por mensagens. Duplicatas recebidas/enviadas não geram novo evento de mensagem.

O corpo tem `{id,event,occurredAt,data:{entityId}}`, sem conteúdo de mensagem, telefone ou nome. Cabeçalhos: `X-MK-Delivery-ID` e `X-MK-Signature-256: sha256=<HMAC dos bytes JSON>`. O consumidor verifica a assinatura e deduplica pelo ID. O ID identifica a entidade correspondente ao evento, que pode ser uma ficha ERP ou mensagem WhatsApp; não usar um como identidade do outro.

Os registros são enfileirados após o commit do módulo; a tentativa HTTPS usa `after()` do Next.js. Esse desenho tem uma janela entre commit e enqueue: falha nessa etapa não desfaz o dado de negócio, produz registro sanitizado no servidor e exige investigação. Não foi implementada transação distribuída entre domínios. Falha de entrega permanece no banco e não é anunciada como sucesso.

Teste usa `POST /webhooks/{id}/test {confirmation:"TESTAR"}` e retorna `ok/status/error`, inclusive quando a requisição de teste foi executada mas o destino recusou a entrega. Uma consulta ao histórico mostra status/tentativas, sem assinatura. Nova tentativa exige `{id,confirmation:"REENVIAR"}` e admite até cinco. Uma execução presa em `sending` há mais de um minuto pode ser retomada manualmente; a confirmação do receptor exige deduplicação, pois o processo pode encerrar depois do envio e antes de registrar a resposta.

Não há scheduler remoto de retry/alertas ativado por esta entrega. O administrador deve acompanhar falhas e definir retenção da auditoria/fila. DNS tem prazo limitado, e HTTPS usa timeout. Nenhum teste desta entrega enviou conteúdo a um endpoint real externo.

## 9. Respostas, verificações e implantação

Respostas privadas usam `no-store`. Erros são `{error,code?}`, sem stack, connection string ou segredo. 400: contrato inválido; 401: sessão/chave; 403: papel/origem/escopo; 404: recurso; 409: revisão/vínculo/estado; 413: tamanho; 415: conteúdo; 429: limite; 503: dependência de configuração/banco. Falhas inesperadas são sanitizadas. Leituras e mutações possuem limites persistidos por ator/rota.

Comandos de verificação:

```sh
npm run typecheck
npm run test:auth
npm run test:whatsapp
npm run test:integrations
npm run test:erp
npm run test:erp:postgres
npm run test:postgres
npm run build
npm run test:whatsapp:http
```

Resultados da rodada de 12/10/2026: checagem TypeScript e build de produção concluídos; 76 testes unitários passaram (11 autenticação, 37 WhatsApp/Meta, 9 gestão e 19 ERP/acesso). Os 11 casos do core ERP também passaram em PostgreSQL local, com o protocolo `pg`. A suíte PostgreSQL adicional aplicou as sete migrações e verificou RLS, transações, recuperação, configuração cifrada, CRM, papéis, convites, chaves, fotos/anexos BYTEA, mescla de metadados, assinatura e notificações. A suíte HTTP completa passou com handlers de produção, oito recursos, revisão, permissões, convites, uploads, catálogo, downloads e páginas. Esses resultados não validam uma instância Supabase remota nem TLS de produção. A conta administrativa local também foi conferida por uma sessão temporária revogada ao final; não foram incluídos dados comerciais fictícios no banco de trabalho.

As suítes isolam arquivos/credenciais e não devem ser executadas contra banco de clientes. O HTTP completo cobre também ERP, convites, Bearer, papéis, arquivos e páginas operacionais. A preparação local não declara aprovação Meta nem disponibilidade remota. A inspeção visual por ferramenta de navegador não foi concluída, devido ao bloqueio de controle registrado nesta sessão.

Antes de publicar: configurar os projetos reais, sete migrações, TLS, origem HTTPS, administradores, key encryption, hosts autorizados, política de backups/restauração, SMTP se usado, Meta/WABA/número e rotinas de operação. Faça smoke test no ambiente de homologação com contas e dados autorizados. O [checklist WhatsApp](pendencias-implantacao-whatsapp.md) complementa esses itens; o guia Meta não substitui os requisitos operacionais dos outros módulos.
