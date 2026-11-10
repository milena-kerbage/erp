# Instagram do Ateliê — primeira implementação

Implementado em 10/11/2026 para **Instagram API with Instagram Login**, conta profissional do próprio Ateliê, uma conta por app. Não misturar com Facebook Login, Unified Login ou Instagram Basic Display. A imagem enviada foi tratada como a lista dos seis itens de configuração solicitados.

## Endereços para copiar na Meta

Usando a origem pública já indicada pelo projeto (`https://app.ateliemilenakerbage.com.br`):

| Item solicitado | Valor |
| --- | --- |
| URL de redirecionamento do login | `https://app.ateliemilenakerbage.com.br/api/instagram/oauth/callback` |
| URL de desautorização | `https://app.ateliemilenakerbage.com.br/api/instagram/deauthorize` |
| URL de exclusão de dados (callback) | `https://app.ateliemilenakerbage.com.br/api/instagram/data-deletion` |
| URL do webhook | `https://app.ateliemilenakerbage.com.br/api/instagram/webhook` |
| Token de verificação do webhook | Valor de `INSTAGRAM_VERIFY_TOKEN`, gerado por `npm run instagram:preparar`; visível apenas para gestão autorizada na tela do Instagram |
| Política de privacidade | `https://app.ateliemilenakerbage.com.br/privacidade` |
| Termos de uso | `https://app.ateliemilenakerbage.com.br/termos` |
| Instruções de exclusão | `https://app.ateliemilenakerbage.com.br/exclusao-de-dados` |

A tela `/configuracoes/instagram` calcula as URLs a partir de `INSTAGRAM_PUBLIC_BASE_URL`, `PUBLIC_BASE_URL` ou `AUTH_ORIGIN`, nessa ordem. Só usar o host do ERP: o host `www.` reescreve rotas para a loja. A origem deve ser HTTPS, sem caminho, busca ou credenciais. HTTP em loopback só é aceito fora de produção para testes.

## Configurar

1. Aplicar `supabase/migrations/015_instagram.sql` no banco da instalação depois das migrações anteriores. É aditiva, cria tabelas privadas em `erp_meta` e habilita RLS. O script geral `npm run db:migrate -- --confirm=APLICAR-MIGRACOES --allow-existing` reaplica todas as migrações idempotentes; conferir o destino antes. Nenhuma migração remota é aplicada pela implementação local.
2. No produto Instagram do app Meta, escolher **API setup with Instagram login** e cadastrar o perfil profissional do Ateliê. Obter o **Instagram App ID** e o **Instagram App Secret** em **Business login settings**; preencher `INSTAGRAM_APP_ID` e `INSTAGRAM_APP_SECRET`. Não reutilizar automaticamente `META_APP_ID` ou o segredo do WhatsApp.
3. Preencher `INSTAGRAM_GRAPH_VERSION` com uma versão suportada no painel. A integração exige escolha explícita; os exemplos oficiais consultados usam v27.0. O feed legado mantém seu padrão anterior enquanto não se adota OAuth.
4. Preencher `INTEGRATION_ENCRYPTION_KEY` com a chave estável de 32 bytes em base64 da instalação. Preservar a mesma chave entre deploys; nunca trocar a chave de integrações existentes sem migração. O painel de gestão WhatsApp já tem o bootstrap dessa chave. Não colocar segredos em variáveis `NEXT_PUBLIC_`.
5. Rodar `npm run instagram:preparar`: gera apenas o Verify Token ausente no `.env.local`, sem imprimir seu valor. Copiar esse valor para `INSTAGRAM_VERIFY_TOKEN` na hospedagem e para **Verify Token** no painel Meta. O gestor autorizado pode mostrá-lo na tela do Instagram. Reiniciar o desenvolvimento após mudar o ambiente. O script não provisiona credenciais na Meta.
6. Configurar `INSTAGRAM_WEBHOOK_APP_SECRET` com o App Secret usado pela Meta para assinar as notificações. O guia de setup de webhooks aponta **App settings > Basic** para esse segredo; o segredo de Business Login é configurado separadamente em `INSTAGRAM_APP_SECRET`. Validar com uma entrega real assinada; não desabilitar a assinatura em caso de divergência.
7. Cadastrar as URLs da tabela nos campos de Business Login e em Webhooks. A URL de redirecionamento deve coincidir exatamente, inclusive barra final: o callback implementado não termina em `/`.
8. `INSTAGRAM_SCOPES` começa com `instagram_business_basic`. Para receber DMs e comentários, configurar também as permissões correspondentes na Meta e usar `instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments`. O backend conhece a permissão atual de publicação, mas não implementa publicação; não solicitá-la nesta versão.
9. Entrar com uma sessão real de administrador do ERP (ou gestor autorizado pela configuração existente), abrir **Configurações → Integrações → Instagram → Configurar**, conectar `@milenakerbageatelie` e, após autorizar as permissões adicionais, clicar **Habilitar notificações**. A conta esperada pode ser alterada por `INSTAGRAM_EXPECTED_USERNAME`.
10. Inscrever os mesmos campos no app e na conta. A tela faz a inscrição da conta por `POST graph.instagram.com/{versão}/{IG_ID}/subscribed_apps`, somente para permissões concedidas: mensagens, postbacks, leitura, reações, referral, comentários e live_comments. A inscrição no painel do app é uma etapa separada.
11. Configurar execução diária de `npm run instagram:manutencao` no ambiente seguro do servidor. Ela elimina eventos vencidos e renova o token se faltar até 15 dias para vencer e ele tiver pelo menos 24 horas. A rotina foi criada; nenhum agendamento externo foi provisionado. Sem a rotina, também há limpeza oportunista na recepção e consulta dos eventos.

O guia de Business Login distingue Standard Access para contas próprias/gerenciadas adicionadas ao app e Advanced Access para contas de terceiros. Elegibilidade, modo do app, permissões e revisão devem ser conferidos no painel da instalação. O código não concede acesso nem garante aprovação.

## Contratos e proteção

| Método e caminho | Comportamento |
| --- | --- |
| `POST /api/instagram/oauth/start` | Gestor, Origin confiável e sessão real; retorna URL oficial com state aleatório de uso único, validade 10 min, vinculado a usuário e sessão |
| `GET /api/instagram/oauth/callback` | Consome state inclusive em cancelamento; troca código pelo token curto, troca por longo, consulta `/me`, valida o perfil e armazena o acesso criptografado; redireciona para a configuração com resultado genérico |
| `GET /api/instagram/webhook` | Valida mode e Verify Token, responde somente o challenge em texto |
| `POST /api/instagram/webhook` | HMAC SHA-256 do corpo bruto, limite 1 MiB, limitação de frequência após assinatura, valida objeto/conta, persiste eventos criptografados antes do 200; deduplica entregas iguais |
| `POST /api/instagram/deauthorize` | Formulário `signed_request` assinado pelo Instagram App Secret; apaga conexão e eventos vinculados e registra supressão |
| `POST /api/instagram/data-deletion` | Mesmo contrato assinado; inicia exclusão local e retorna `{url, confirmation_code}` persistente e idempotente enquanto pendente |
| `GET /api/instagram/data-deletion/status?code=...` | Público; só status e datas, sem identidade, hashes ou mensagens; 404 se inexistente |
| `GET /exclusao-de-dados/instagram/status?code=...` | Acompanhamento legível sem login; protocolo de 192 bits, sem informações do titular |
| `GET /api/instagram/status` | Diagnóstico só para gestão, sem tokens de acesso ou segredos |
| `POST /api/instagram/webhook/verify-token` | Revelação explícita do Verify Token somente para gestão, com Origin validado; não revela App Secret/token de acesso |
| `POST /api/instagram/subscribe` | Inscreve a conta nos campos correspondentes às permissões concedidas |
| `POST /api/instagram/token/refresh` | Renova token válido com pelo menos 24 horas e persiste a nova validade |
| `POST /api/instagram/disconnect` | Remove acesso e eventos locais; a revogação no provedor também pode ser feita nas configurações do Instagram |
| `GET /api/instagram/events` | Últimos 50 eventos decifrados, só para gestão; base para a próxima etapa do atendimento |
| `GET /api/instagram/deletion-requests` | Lista de protocolos para revisão, só para gestão |
| `PATCH /api/instagram/deletion-requests` | Finaliza revisão com JSON `{code,status,note}`; status `completed` ou `no_matching_data`, nota de 10–1000 caracteres criptografada; exige gestão e Origin confiável |

Não registrar URLs de troca/renovação no proxy, APM ou logs: os endpoints oficiais de troca longa e renovação recebem segredos em query. Erros ao cliente são genéricos e não repassam respostas privadas da Meta. Tokens e eventos usam AES-256-GCM com contexto autenticado por app e finalidade. O banco registra os IDs de conexão separadamente: ID app-scoped retornado na troca e `user_id` de `/me` (ID usado pelo webhook). Não há conversão para telefone ou conta de cliente.

Exclusão, persistência de eventos e gravação da conexão são serializadas por lock transacional no PostgreSQL, também entre instâncias; SQLite usa o serializador do adaptador. Revogação invalida estados e impede que uma troca OAuth já iniciada reconecte a conta depois da exclusão. Supressões vinculam IDs pseudonimizados a eventos e impedem recriação por entrega atrasada. Protocolos e supressões não expiram automaticamente: revisar sua conservação mínima operacionalmente. Notas de revisão nunca são públicas.

## Feed, exclusão e limites da primeira versão

Com `INSTAGRAM_APP_ID` configurado, a loja usa exclusivamente o token da conexão OAuth no banco. Ausência de conexão, token expirado ou falha de leitura mostra o convite para seguir. Não recorre ao token legado do ambiente após revogação. OAuth, renovação, desconexão e callbacks de exclusão invalidam o cache do feed. Sem `INSTAGRAM_APP_ID`, o fluxo legado de `INSTAGRAM_ACCESS_TOKEN` e `instagram:renovar-token` continua existindo; migre/remova o token legado ao ativar OAuth.

O callback apaga imediatamente os dados locais identificados e mantém o protocolo em `pending_review` para a equipe revisar outros vínculos no ERP e atender o pedido inteiro. Não afirmar exclusão global concluída só porque o callback respondeu 200. A equipe consulta os protocolos na API de gestão e registra conclusão com evidência após a revisão. Quando o identificador não permitir mapear outra identidade, usar o canal de privacidade informado nas páginas públicas. A remoção local não apaga cópias na Meta, destinatários ou backups.

Esta entrega implementa os itens da imagem e a infraestrutura de conexão e recepção. Ainda **não** implementa caixa de Direct, respostas a mensagens, criação automática de leads, moderação pela interface, publicação de posts, campanhas ou insights. Não solicitar permissões para funções não demonstráveis na revisão. O número de eventos recebidos não prova atendimento ou envio de uma mensagem.

## Fontes oficiais consultadas

O navegador de pesquisa retornou 429 em parte das URLs antigas. As páginas oficiais abaixo foram obtidas diretamente pelos endpoints de documentação, que forneceram o conteúdo textual. Foi consultado o índice completo do produto para localizar o material pertinente aos contratos implementados, sem alegar leitura de toda a documentação de todos os produtos Meta.

- [Índice oficial do produto](https://developers.facebook.com/documentation/instagram-platform/llms.txt)
- [Instagram API with Instagram Login](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login)
- [Business Login e tokens](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login)
- [Get Started: identificação da conta](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/get-started)
- [Criar app e callbacks](https://developers.facebook.com/documentation/instagram-platform/create-an-instagram-app)
- [Webhooks: visão geral](https://developers.facebook.com/documentation/instagram-platform/webhooks)
- [Setup: challenge, HMAC, inscrição e entrega](https://developers.facebook.com/documentation/instagram-platform/webhooks/setup)
- [Matriz de campos e permissões](https://developers.facebook.com/documentation/instagram-platform/webhooks/fields)
- [Exemplos dos payloads](https://developers.facebook.com/documentation/instagram-platform/webhooks/examples)
- [Revisão do app](https://developers.facebook.com/documentation/instagram-platform/app-review)
- [Callback de exclusão](https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback/)

O guia de criação confirma os campos de desautorização e exclusão do Business Login; o contrato de `signed_request` é documentado pelo guia geral de exclusão e precisa ser confirmado com callbacks reais do produto na instalação. A coleta dos termos gerais retornou HTML e não foi contada como revisão contratual integral. As páginas legais foram atualizadas para descrever o comportamento da implementação; a definição das bases e a contratação continuam sob responsabilidade do controlador.

## Validação e ativação externa

Executar `npm run test:instagram`, `npm run test:instagram:postgres`, `npm run typecheck` e o build. O teste `npm run test:instagram:http` usa um build isolado em `.next-validacao`, servidor de produção com autenticação obrigatória, bancos temporários e credenciais fictícias; não usa o banco nem os perfis reais.

Validação local desta entrega: testes unitários da integração e regressões de WhatsApp/Meta, gestão e feed aprovados; migração executada duas vezes no PostgreSQL WASM isolado, com RLS/grants verificados; teste HTTP em produção aprovado para autenticação/papéis/Origin, callbacks públicos, cancelamento OAuth, challenge, assinatura, persistência/deduplicação, exclusão e revisão. TypeScript e build de produção isolado aprovados. O Verify Token foi gerado em `.env.local`, preservando as demais credenciais. Nenhuma migração, publicação ou chamada à conta Meta real foi feita.

Depois do deploy/migração/configuração, verificar as páginas sem sessão, cadastrar e validar o webhook, conectar a conta de teste, inscrever os campos, enviar uma mensagem/comentário controlado e confirmar a persistência. Repetir entrega para verificar deduplicação; testar assinatura inválida e revogação/exclusão real. Não há validação externa ou publicação implícita por testes locais.
