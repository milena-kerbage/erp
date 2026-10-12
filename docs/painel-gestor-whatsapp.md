# Guia do gestor: configurar e acompanhar o WhatsApp pelo sistema

Atualizado em 12 de outubro de 2026.

O ponto de trabalho do gestor é **Configurações → Integrações**, em `/configuracoes/integracoes`. O painel reúne a configuração empresarial, credenciais protegidas, pendências, URLs da Meta, testes e acompanhamento dos pedidos. A caixa de atendimento continua em `/conversas`; `/configuracoes/whatsapp` abre o mesmo painel na aba de testes. Operadores de atendimento usam a caixa de conversas; operações administrativas exigem autorização de gestor.

O painel pode preparar e verificar a integração. A **Meta emite o token de acesso** e determina a situação do aplicativo, do número, das permissões e dos modelos. Uma chave gerada pelo próprio sistema para verificar o webhook não substitui esse acesso. Configuração salva, diagnóstico respondido e mensagem entregue são resultados diferentes e aparecem em etapas distintas.

Os botões de download do painel fornecem este guia, o manual técnico e o documento de pendências em Markdown. Todos exigem acesso de gestor e podem ser guardados para compartilhar o planejamento com as pessoas autorizadas. Não é preciso abrir o repositório para obtê-los.

## 1. Antes do primeiro acesso: preparação técnica única

O responsável técnico precisa disponibilizar Vercel, Supabase, as sete migrações e uma conta interna autorizada de gestor. O ERP possui papéis e convites persistidos, documentados no [manual do backend](erp-backend.md); a allowlist da integração WhatsApp continua sendo uma autorização separada. Depois dessa preparação, a operação cotidiana descrita aqui é feita nas páginas do sistema e nos portais oficiais da Meta, sem comandos de terminal.

Três informações de banco, criptografia e autorização ficam exclusivamente no ambiente privado da hospedagem, junto à origem HTTPS que a autenticação existente exige:

| Informação | Para que serve | Quem controla |
| --- | --- | --- |
| `DATABASE_URL` | Conexão privada ao PostgreSQL do Supabase | Administrador do banco e da Vercel |
| `INTEGRATION_ENCRYPTION_KEY` | Chave aleatória de 32 bytes em base64 que protege as credenciais guardadas no banco | Administrador de infraestrutura, em cofre privado |
| `INTEGRATION_MANAGER_EMAILS` | Lista de e-mails de usuários autorizados a administrar a integração | Gestor responsável e administrador |
| `AUTH_ORIGIN` | Origem HTTPS exata da autenticação, por exemplo `https://app.ateliemilenakerbage.com.br` | Administrador de infraestrutura |

A chave de criptografia não deve ser trocada sem um procedimento de migração/recriptografia e recuperação. Perder essa chave pode tornar as credenciais salvas inutilizáveis; alterá-la não revoga o token existente na Meta. A conexão do banco não é editável pelo formulário do gestor. Certificado/CA, DNS, projeto, usuário inicial e permissões do banco são configuração técnica da instalação.

O administrador deve confirmar HTTPS e os esquemas privados antes de abrir o painel. Convide pessoas pelos mecanismos oficiais das plataformas; não compartilhe senha pessoal, código de autenticação ou acesso de outra pessoa.

No desenvolvimento local, a ação **Preparar criptografia local** pode criar a primeira chave em `.env.local`, arquivo privado com permissão 0600, e exibi-la uma vez para guardar em cofre. A ação existe somente em desenvolvimento/loopback, fora da Vercel. Não publica a configuração de produção nem retorna uma chave já armazenada. Não adicionar `.env.local` ao Git, backup público ou pacote de frontend.

Se a chave válida já existir, a preparação a preserva e não revela seu valor novamente. Chave existente inválida ou segredos cifrados sem a chave original bloqueiam a geração; restaure a original pelo procedimento técnico. Gerar uma chave nova não recupera os segredos perdidos e não é uma forma segura de substituir a anterior.

## 2. Entrar e entender os estados

1. Abra a URL publicada, por exemplo `https://app.ateliemilenakerbage.com.br/login`.
2. Use a conta interna que o responsável técnico provisionou com seu e-mail autorizado.
3. Acesse **Configurações → Integrações**.
4. Confira as pendências de infraestrutura, dados e ativos antes de realizar qualquer envio.

| Estado observado | O que significa | Próximo passo |
| --- | --- | --- |
| Sem acesso de gestor | Sua conta não está autorizada para configurar segredos e operações administrativas | O administrador confere a lista de gestores; não empreste contas |
| Configuração pendente | Existem dados, credenciais ou dependências faltantes | Preencher os campos e concluir os itens do roteiro |
| Configuração salva/completa | O servidor recebeu os valores necessários | Validar token e diagnóstico remoto |
| Diagnóstico remoto respondeu | A Meta respondeu às consultas e retornou informações de ativos | Conferir número/app/WABA e testar com contato autorizado |
| Webhook recebido | O aplicativo recebeu um evento aceito | Confirmar que é do número e contato de teste corretos |
| Mensagem entregue/lida | A Meta informou aquele estado técnico | Conferir também o conteúdo no aparelho do destinatário |

O sistema não transforma uma simulação local em aprovação externa. Um teste de assinatura, callback ou formulário pode ser concluído localmente mesmo enquanto o app Meta ainda não existe; isso não comprova emissão de token ou entrega de mensagem.

O painel possui seis abas:

| Aba | Trabalho principal |
| --- | --- |
| Etapas | Acompanhar 24 pendências, responsáveis, evidências e progresso |
| Configuração | Salvar dados, guardar credenciais e preparar autorização condicional |
| Testes | Executar verificações técnicas, inscrever WABA e testar envio autorizado |
| URLs | Copiar endereço, conferir método/acesso e ver exemplos do contrato |
| Eventos | Consultar ações administrativas e resultados limitados |
| Privacidade | Consultar fontes, excluir contato verificado e revisar protocolos Meta |

## 3. Preencher a configuração empresarial

Confira os dados informados para esta instalação:

- Nome comercial: Ateliê Milena Kerbage.
- Responsável informado: Milena Cavalcante Kerbage.
- CNPJ: 13.592.162/0001-08.
- Endereço: Rua Professor Heraclito, 233, Vicente Pinzon, Fortaleza - CE, CEP 60181-245.
- Origem planejada: `https://app.ateliemilenakerbage.com.br`.
- E-mail de privacidade e suporte confirmado: `milenakerbageatelie@gmail.com`.

O endereço de e-mail já foi informado e está configurado para as duas finalidades; confirme a publicação e teste recebimento/resposta. Ainda falta confirmar o telefone oficial com DDI. Uma pessoa deve acompanhar a caixa e os demais contatos. Os dados publicados nas políticas precisam corresponder à empresa e aos canais efetivamente disponíveis.

O gestor também informa os identificadores do aplicativo e do canal:

| Campo | Onde obter | Cuidado |
| --- | --- | --- |
| App ID | Aplicativo no Meta Developers | Não é WABA ID |
| WABA ID | Conta WhatsApp empresarial no painel Meta | Não é número de telefone nem portfólio ID |
| Phone Number ID | Configuração/API Setup do número comercial | Não é o telefone exibido |
| Telefone público | Número que o cliente utiliza para falar com o Ateliê | Usar DDI e conferir o proprietário |
| Versão Graph | Versão suportada mostrada na documentação/painel atual | Não existe escolha automática de `latest` |
| URL pública | Domínio HTTPS realmente publicado | Não apontar para localhost, preview privado ou domínio sem certificado |
| Retenção | Decisão aprovada pela empresa | Padrão 90 dias; isso não é um prazo legal universal |

Salvar esses campos não cria os ativos na Meta. Se conta, aplicativo ou número ainda não existirem, avance primeiro no roteiro de criação pelos links oficiais do painel.

## 4. Obter e guardar credenciais

### 4.1 Token de acesso da Meta

O administrador Meta deve abrir o portfólio/aplicativo correto, conferir o acesso aos ativos e usar o mecanismo de emissão de token disponibilizado para a conta. Para uso contínuo dos ativos próprios, avalie o token de usuário de sistema que o painel empresarial permitir; registre a validade e as permissões retornadas pela Meta. O token temporário de início/teste não deve ser presumido como solução permanente.

As funções implementadas utilizam `whatsapp_business_messaging` para mensagens e `whatsapp_business_management` para as consultas/gestão pertinentes à WABA. Permissões adicionais dependem de uma função concreta e das exigências do aplicativo. Não pedir permissões de Ads, Instagram ou Pages só porque existem no painel.

No painel do ERP, use a área de credenciais para salvar o valor emitido pela Meta. Depois de salvar, a interface deve indicar sua presença/estado sem devolver o conteúdo completo. Não colar o token em campo de observação, checklist, conversa com cliente, print ou documento. Não use um token de outra empresa para testar o Ateliê.

### 4.2 App Secret

Obtenha o App Secret no aplicativo Meta pertinente e guarde pelo campo protegido. Ele valida as assinaturas do webhook e do callback de exclusão. App Secret de outro aplicativo faz as assinaturas legítimas falharem. Não é a senha de login nem o Verify Token.

### 4.3 Verify Token

O Verify Token é um segredo escolhido pelo aplicativo para a verificação inicial do endereço do webhook. O painel pode gerá-lo aleatoriamente. Copie-o apenas para o campo **Verify Token** da configuração de callback da Meta e conclua o handshake.

O Verify Token não autoriza envio de mensagem e não é emitido pela Meta como access token. A assinatura dos eventos POST usa App Secret; o Verify Token não substitui essa assinatura.

### 4.4 Chave de supressão

A chave de supressão protege o identificador dos números que cancelaram mensagens ou tiveram dados excluídos. O painel pode preparar uma chave aleatória para a primeira configuração. Uma chave já usada não deve ser regenerada por conveniência, pois isso pode impedir o reconhecimento das recusas antigas.

Se for necessária rotação, o responsável técnico deve avaliar a migração dos registros e a continuidade do bloqueio. O gestor não deve apagar ou trocar essa chave para reativar uma pessoa que pediu cancelamento.

### 4.5 Validar o token

Use a ação de inspeção/validação. Ela consulta a Meta e apresenta metadados úteis, como validade, app e permissões, sem retornar o próprio segredo. Confirme que o aplicativo e os ativos correspondem ao Ateliê. Em seguida, execute o diagnóstico do número e da WABA.

Um token pode estar sintaticamente presente e ainda ser inválido, expirado, revogado ou sem permissão. A validação do formato local não é validação de acesso da Meta.

### 4.6 Solicitar maior duração para token de usuário

Se a inspeção retornar um token do tipo `USER`, válido e emitido pelo aplicativo correto, a ação de troca de duração pode solicitar uma extensão à Meta mediante confirmação `RENOVAR`. A resposta precisa ser confirmada pelo provedor e o novo token é guardado no servidor. Inspecione novamente a validade depois da troca.

Isso não converte token de usuário em token permanente de sistema e não se aplica a `SYSTEM_USER` ou tipos diferentes. Se a Meta recusar, siga o fluxo autorizado de emissão da conta empresarial. Não há garantia de duração ilimitada nem um refresh automático implementado.

### 4.7 Desativar uma credencial

A ação de desativação do painel impede o ERP de utilizar a credencial e não reativa automaticamente uma cópia antiga do ambiente. Ela pode interromper envios ou o recebimento de callbacks; leia e confirme o efeito antes de executar. Não é possível desativar a chave de supressão pelo fluxo comum.

Desativar no ERP não revoga a credencial na Meta. Se houver compromisso, saída de prestador ou necessidade de revogação, o administrador deve realizar o procedimento no provedor e avaliar as consequências. Para retomar, guardar uma nova credencial legítima e verificar novamente o serviço.

## 5. Conectar pela autorização Facebook: opção condicional

Quando o aplicativo estiver configurado e habilitado para o fluxo Facebook Login suportado, o gestor poderá iniciar a autorização pelo botão correspondente. Antes de usar, o administrador precisa cadastrar o callback exato, domínio e permissões apropriadas no app Meta. A habilitação opcional também exige `META_OAUTH_ENABLED=true` no ambiente da hospedagem; não há necessidade de ativá-la para salvar um token legítimo obtido manualmente no portal Meta.

1. Confirme que o App ID, o App Secret e a origem pública correspondem ao app preparado.
2. No Meta Developers, habilite/configure o fluxo de login pertinente e cadastre a URL exata de callback apresentada pelo ERP.
3. Leia a confirmação do painel: o fluxo é uma autorização da Meta, não uma geração local irrestrita de acesso.
4. Inicie a conexão. O navegador deve abrir a página oficial `facebook.com` para que a pessoa autorizada escolha e conceda as permissões.
5. Ao retornar, o servidor valida o estado da tentativa, troca o código de autorização e guarda o token obtido de forma protegida.
6. Confira o resultado e os metadados; faça também o diagnóstico da WABA e um teste controlado.

A autorização está ligada à sessão e ao usuário gestor, com estado aleatório de uso único e validade de 10 minutos. O servidor guarda hash do estado e da sessão. O callback recebe o código, consome o estado e redireciona com HTTP 303 ao painel, sem devolver token ou manter o código na URL de destino. Se a pessoa cancelar na Meta, o resultado indica cancelamento/recusa; a tentativa não gera um acesso fictício.

Este caminho utiliza autorização clássica condicional para o aplicativo habilitado. **Não representa Embedded Signup universal**, não cria automaticamente portfólio/WABA/número e não promete um token permanente de usuário de sistema. A Meta pode retornar um token de usuário; a troca por duração maior, quando suportada, continua sujeita à validade e à revogação informadas pela plataforma. Não há promessa de refresh automático ilimitado.

Os documentos atuais de Facebook Login for Business/Embedded Signup tiveram bloqueio 429 nesta pesquisa. A referência de contrato clássico foi cruzada com código do SDK oficial histórico. A elegibilidade e o comportamento atuais precisam ser confirmados no aplicativo real antes de declarar a conexão pronta. Se o app não estiver habilitado para esse fluxo, obtenha o token no portal Meta e salve no campo protegido do ERP.

## 6. Copiar as URLs corretas para a Meta

A área de URLs mostra o caminho, método HTTP, quem pode usar e para que serve cada endereço. Use a origem publicada apresentada no painel. Os principais campos são:

| No painel Meta | Endereço da aplicação |
| --- | --- |
| App URL | `/` |
| Privacy Policy URL | `/privacidade` |
| Terms of Service URL | `/termos` |
| User Data Deletion Instructions | `/exclusao-de-dados` |
| Data Deletion Callback | `/api/meta/data-deletion` |
| Callback URL WhatsApp | `/api/whatsapp/webhook` |
| OAuth Redirect URI, quando habilitado | `/api/whatsapp/management/oauth/callback` |

Não informar a página de instruções em um campo que exige callback POST, nem usar o endpoint POST como se fosse um documento HTML público. Abrir um callback sem os parâmetros necessários pode produzir um erro esperado: isso não prova que a URL inexiste.

A consulta de exclusão recebe um protocolo específico gerado para o pedido. Não há código padrão que deva ser colocado no painel Meta. APIs privadas como envio, histórico e gestão continuam exigindo sessão e autorização pertinente; não devem ser tornadas públicas para “facilitar o teste”.

## 7. Verificar e inscrever o webhook

1. Confira a URL HTTPS do webhook e o Verify Token salvos.
2. No aplicativo Meta, cadastre callback e Verify Token, conforme o campo vigente.
3. A Meta enviará um challenge. A aplicação devolve o valor em texto quando a verificação é válida.
4. Configure o objeto/campo `messages` e a assinatura apropriada.
5. Use a ação de inscrição da WABA no painel somente após conferir o aplicativo e a conta. Essa ação modifica a inscrição no ativo e requer confirmação explícita `INSCREVER`. Antes do POST externo, o servidor inspeciona o token e bloqueia com `TOKEN_NOT_AUTHORIZED` quando a validade, o App ID ou as permissões não correspondem.
6. Execute novamente o diagnóstico e confira que o app inscrito é o do Ateliê.
7. Envie uma mensagem pelo WhatsApp de teste autorizado e confirme sua chegada à caixa real do ERP.

Salvar callback não comprova que o app esteja inscrito na WABA. Um exemplo sintético com WABA/Phone Number ID diferente pode ser ignorado corretamente. Uma assinatura inválida deve ser recusada; não desativar essa proteção para testar.

## 8. Fazer testes sem confundir o resultado

O painel reúne verificações locais e operações que consultam a Meta. Leia a finalidade antes de executar. Ações que enviam mensagem, inscrevem a WABA, excluem dados ou alteram autorização precisam de intenção e confirmação apropriadas.

| Verificação | Comprova | Não comprova |
| --- | --- | --- |
| Configuração/URLs locais | Campos, caminhos e dependências do aplicativo | DNS, cadastro ou aprovação Meta |
| Assinatura/contrato local | Validação do endpoint para o caso testado | Entrega real da Meta |
| Inspeção do token | Metadados de acesso retornados pela Meta | Que todo ativo esteja corretamente inscrito |
| Diagnóstico remoto | Resposta Meta do número/WABA | Recepção e envio no dispositivo |
| Template consultado | Modelo existente e situação atual da conta | Autorização da pessoa para recebê-lo |
| Prévia de retenção | Prazo e estimativa do escopo da manutenção | Exclusão executada ou cron de manutenção instalado |
| Mensagem enviada | Uma operação começou ou foi aceita | Entrega, leitura, pagamento ou aceite comercial |
| Mensagem entregue | A Meta informou entrega | Consentimento genérico ou contratação |
| Protocolo de exclusão criado | Pedido recebido e identificado por protocolo | Dados eliminados por revisão concluída |

### Teste de envio e recepção

1. Escolha um número de teste que autorizou a experiência e informe o telefone internacional.
2. Envie uma mensagem do WhatsApp para o número do Ateliê e localize-a em `/conversas`.
3. Registre no painel de atendimento a evidência real de autorização para a categoria.
4. Responda com texto dentro da janela de 24 horas e confira a entrega no aparelho.
5. Se necessário, selecione um template aprovado e compatível para testar o envio permitido fora da janela.
6. Observe status e histórico. Em resultado desconhecido, aguarde a confirmação; não crie um novo envio automaticamente.
7. Remova os dados fictícios quando o teste terminar e conserve somente evidência mínima de resultado.

O texto livre é bloqueado fora da janela. A janela regula o tipo de mensagem permitido; não garante gratuidade. Os modelos usados pelo aplicativo admitem variáveis posicionais de texto no corpo. Edição/aprovação de modelos é feita no WhatsApp Manager.

### Teste de recusa, mídia e exclusão

No contato fictício, solicite SAIR/PARAR e verifique o bloqueio e a ausência da lista ativa. Pedidos em outras palavras ou por e-mail também devem ser atendidos pela equipe. Se a pessoa quiser retomar, registrar nova manifestação explícita real; não usar o botão de autorização para vencer um bloqueio sem consentimento.

Para mídia, use arquivo permitido abaixo do limite da instalação: 3 MiB na Vercel. O download exige sessão e não guarda o binário automaticamente no backend. Para exclusão, confirme identidade/legitimidade e o efeito sobre o histórico. Esse teste não deve ocorrer no banco de clientes reais.

## 9. Acompanhar checklist, testes e registros

O roteiro tem os itens P01–P24, organizados por responsáveis/canais, infraestrutura, ativos Meta, conexão, testes e operação. Os detalhes estão também em `docs/pendencias-implantacao-whatsapp.md`.

Marque conclusão apenas quando a evidência existir. Use as situações Pendente, Em andamento, Concluída ou Bloqueada e registre uma observação curta, como “domínio HTTPS conferido na implantação de homologação” ou “recepção e entrega comprovadas com contato fictício autorizado”. Não coloque token, senha, documento, telefone completo ou conteúdo privado na observação.

Os registros do painel ajudam a acompanhar alterações e testes. Exibem ação, data e resultado limitado; a autoria é conservada na auditoria interna. Não substituem o processo de privacidade nem um monitoramento completo da infraestrutura. A ausência de registro de erro não comprova disponibilidade contínua.

Antes de liberar clientes reais, confirme canais acompanhados, retenção/backup, responsável por direitos e incidentes, custos, permissões e estado da revisão Meta quando exigida. Não marcar o checklist como concluído por uma tela demonstrativa.

## 10. Revisar pedidos de exclusão

Abra a fila de solicitações no painel de gestor. Um pedido assinado recebido da Meta começa pendente de revisão. O identificador Meta é diferente de telefone/wa_id; a equipe precisa localizar uma associação legítima.

1. Localize o protocolo e verifique quais dados estão associados ao solicitante.
2. Quando houver necessidade de informação adicional, use um canal apropriado, pedindo apenas o necessário.
3. Se houver contato identificado, confirme a identidade e execute a eliminação real no módulo correspondente. Verifique outros sistemas e cópias pertinentes ao escopo do pedido.
4. Registre a evidência da revisão sem dado pessoal excessivo.
5. Marque conclusão somente após a providência executada e conferida.
6. Use ausência de dados vinculados apenas quando a análise realmente não localizar dados associados à identidade recebida.

O protocolo público informa a situação e não exibe a nota interna. Não o publique em relatório aberto. A lista de supressão preserva um identificador pseudonimizado para impedir recontato; não constitui autorização para conservar todo o histórico.

## 11. Quando algo falhar

| Mensagem/situação | O que fazer |
| --- | --- |
| Acesso de gestor recusado | O administrador confere usuário e lista autorizada; não compartilhar sessão |
| Configuração incompleta | Preencher os itens indicados; conta Meta ausente precisa ser criada no portal |
| Token inválido/expirado | Conferir app, ativos e validade na Meta; emitir/substituir pelo caminho autorizado |
| Falha de certificado ou banco | Responsável técnico verifica CA/TLS/pooler/migrações; não desabilitar proteção em produção |
| Verify Token recusado | Conferir igualdade entre o valor do ERP e o campo do callback Meta |
| Assinatura inválida | Conferir App Secret e app; não aceitar corpo adulterado |
| Número ou WABA incorretos | Corrigir o ID Graph; não trocar por telefone exibido ou portfólio ID |
| Conversa vazia | Conferir inscrição, ativos, assinatura e eventual supressão do contato |
| Sem autorização | Obter manifestação real e registrá-la; modelo aprovado não substitui isso |
| Janela fechada | Usar template autorizado, aprovado e compatível |
| Envio desconhecido | Consultar histórico/webhook e aguardar; repetir pode duplicar mensagem |
| Contato recusou | Respeitar recusa; nova autorização só com manifestação explícita comprovada |
| Anexo grande | Aplicar limite da instalação e procedimento autorizado alternativo |
| OAuth recusado/cancelado | Conferir habilitação, callback, usuário e permissões; token manual emitido pela Meta é alternativa |

## 12. Referências e limite da pesquisa

- [Aplicativos Meta](https://developers.facebook.com/apps/), [Configurações empresariais](https://business.facebook.com/settings/) e [WhatsApp Manager](https://business.facebook.com/wa/manage/home/).
- [Depurador oficial de acesso](https://developers.facebook.com/tools/debug/accesstoken/) e [request Debug Token publicado pela Meta](https://www.postman.com/meta/whatsapp-business-platform/request/i1mz7w8/debug-token).
- [Facebook Login for Business](https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/) e [Embedded Signup](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/overview), com acesso bloqueado nesta pesquisa; validação atual no app real pendente.
- SDK oficial histórico: [OAuth2Client](https://github.com/facebookarchive/php-graph-sdk/blob/5.x/src/Facebook/Authentication/OAuth2Client.php) e [RedirectLoginHelper](https://github.com/facebookarchive/php-graph-sdk/blob/5.x/src/Facebook/Helpers/FacebookRedirectLoginHelper.php). A referência sustenta o fluxo clássico estudado, sem provar que um app recém-criado é elegível para todas as permissões.
- [Política de mensagens da WhatsApp Business](https://whatsappbusiness.com/policy/).

A pesquisa usa fontes primárias e registra indisponibilidades. A verificação externa da conta, token, número, domínio e permissões ainda precisa acontecer. O manual técnico contém a matriz de conferência e os limites da instalação; este guia não substitui as políticas e decisões do responsável pela empresa.
