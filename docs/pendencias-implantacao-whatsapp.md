# Pendências para publicar e testar o WhatsApp do Ateliê

Documento para o gestor · Atualizado em 12 de outubro de 2026.

O sistema foi preparado para integrar o WhatsApp Cloud API e publicar suas políticas. A hospedagem escolhida pelo responsável é Vercel e o banco de produção é Supabase PostgreSQL. **A conta/aplicativo Meta e o número ainda não foram criados; não houve ativação remota nem mensagem real entregue nesta etapa.** Este documento organiza o que precisa ser disponibilizado, quem deve executar cada etapa e qual evidência comprova a conclusão.

As pendências abaixo não impedem desenvolver e testar contratos localmente. Impedem declarar que o canal real está conectado, que as URLs estão publicadas ou que houve aprovação da Meta. O manual completo de arquitetura, APIs, direitos e operação está em `docs/whatsapp-meta.md`. A rotina por páginas está em `docs/painel-gestor-whatsapp.md`; o painel principal é `/configuracoes/integracoes`, com seis abas de etapas, configuração, testes, URLs, eventos e privacidade.

O gestor pode baixar os três documentos WhatsApp pelos botões do próprio painel, sem acessar o repositório. Para papéis e módulos internos persistidos, consulte também [o backend do ERP](erp-backend.md). O download exige sessão e autorização de gestor; só os documentos predefinidos são aceitos.

Na verificação anterior da integração WhatsApp, passaram a checagem de tipos, o build de produção, 57 testes unitários (11 de autenticação, 37 de WhatsApp/Meta e 9 de gestão), as cinco migrações com o driver PostgreSQL em ambiente local e os testes HTTP de autenticação/gestão. Foram conferidos permissões, Origin, credenciais protegidas, geração local, checklist, fila, criptografia e estados OAuth de uso único. As contas reais não foram utilizadas. A inspeção visual pelo navegador não foi concluída, pois a ferramenta de controle foi bloqueada por política. Esses resultados permitem revisar o código preparado; a liberação operacional depende das evidências remotas abaixo.

## 1. O que já está definido

| Item | Definição |
| --- | --- |
| Uso | Atendimento da própria empresa, uma WABA e um número empresarial |
| Nome comercial | Ateliê Milena Kerbage |
| Identificação informada | Milena Cavalcante Kerbage · CNPJ 13.592.162/0001-08 |
| Endereço informado | Rua Professor Heraclito, 233, Vicente Pinzon, Fortaleza - CE, CEP 60181-245 |
| E-mail confirmado de suporte e privacidade | `milenakerbageatelie@gmail.com` |
| Domínio autorizado | `ateliemilenakerbage.com.br` e subdomínios necessários |
| URL planejada | `https://app.ateliemilenakerbage.com.br` |
| Hospedagem | Vercel |
| Banco de produção | Supabase PostgreSQL; acesso somente pelo servidor |
| Políticas | Privacidade, termos, exclusão, cookies, comunicação e índice público |
| Integração | Recepção assinada, envio controlado, status, modelos aprovados, autorização, recusa e exclusão |

Os dados empresariais foram fornecidos no projeto; este documento não declara consulta cadastral independente ou validação pela Meta. A publicação precisa conferir o texto com a empresa.

## 2. Responsáveis por função

Preencha os nomes reais antes da implantação. Uma mesma pessoa pode assumir mais de uma função quando isso for apropriado; a atribuição precisa ser explícita.

| Função | Responsabilidade | Pessoa designada |
| --- | --- | --- |
| Gestor do Ateliê | Autorizar acessos, confirmar dados, serviços, custos e operação | A preencher |
| Administrador do domínio | Configurar DNS e liberar validação de `app` | A preencher |
| Administrador Vercel | Projeto, ambientes, domínio, variáveis sensíveis, deploy e logs | A preencher |
| Administrador Supabase | Projeto, região, banco, migrações, acessos e backups | A preencher |
| Administrador Meta | Portfólio, app, WABA, número, token, perfil e revisão | A preencher |
| Implementador técnico | Aplicar migrações, conferir contratos e executar testes | A preencher |
| Responsável por privacidade | Acompanhar direitos, canais, retenção e incidentes | A preencher |
| Supervisor do atendimento | Validar consentimento, conteúdo, horários e rotina de mensagens | A preencher |

Conceda acesso pelo convite oficial da plataforma e pela função necessária. Não enviar senha pessoal ou código de dois fatores em conversa. Secrets devem ser inseridos em ambiente privado/cofre, sem compartilhar em documento, print, e-mail de revisão ou repositório.

## 3. Lista de pendências e evidências

| ID | Pendência | Quem executa | Evidência de conclusão | Situação inicial |
| --- | --- | --- | --- | --- |
| P01 | Designar responsáveis e contatos reais | Gestor | Tabela de responsáveis preenchida e canais acompanhados | Pendente |
| P02 | Validar acompanhamento da caixa de privacidade | Gestor/privacidade | `milenakerbageatelie@gmail.com` publicado; responsável e teste recebido/respondido | E-mail informado e confirmado; validação operacional pendente |
| P03 | Validar suporte e confirmar telefone oficial | Gestor/atendimento | Caixa `milenakerbageatelie@gmail.com` acompanhada e telefone com DDI correto | E-mail confirmado; telefone e operação pendentes |
| P04 | Disponibilizar conta/projeto Vercel com acesso autorizado | Gestor/admin Vercel | Projeto e equipe com privilégios definidos | Pendente |
| P05 | Disponibilizar projeto Supabase | Gestor/admin Supabase | Projeto de homologação/produção e região registrados | Pendente |
| P06 | Aplicar sete migrações e conferir acesso dos esquemas | Admin Supabase/técnico | `erp_auth`, `erp_whatsapp`, `erp_meta` e `erp_core`, incluindo configuração/gestão e acesso ERP, criados; sem acesso público indevido | Pendente |
| P07 | Configurar bootstrap privado, PostgreSQL/TLS e gestores | Admin Supabase/Vercel | `DATABASE_URL`, chave criptográfica, allowlist e origem; login/consulta funcionam, sem segredo nos logs | Pendente |
| P08 | Configurar domínio e HTTPS | Admin domínio/Vercel | DNS confirmado, certificado válido e aplicação acessível | Pendente |
| P09 | Criar administrador interno do ERP | Gestor/técnico | Login real, sessão, logout e revogação verificados | Pendente |
| P10 | Configurar recuperação por e-mail se usada | Admin infraestrutura | Provedor, remetente, TLS e teste controlado | Pendente |
| P11 | Criar/configurar conta e portfólio empresarial Meta | Admin Meta | Proprietário, identidade e exigências do painel conferidos | Pendente; usuário informou que ainda não criou |
| P12 | Criar app Meta e habilitar WhatsApp | Admin Meta | App ID, produto e acesso aos ativos correspondentes | Pendente; app inexistente no início |
| P13 | Definir e registrar número empresarial e WABA | Gestor/admin Meta | Número/Phone Number ID/WABA ID confirmados | Pendente; número ainda não criado |
| P14 | Configurar token e permissões necessárias | Admin Meta/Vercel | Token com ativos/permissões/validade conferidos por diagnóstico | Pendente |
| P15 | Guardar token/App Secret e preparar Verify Token/supressão no painel | Gestor autorizado | Credenciais cifradas no servidor, handshake e HMAC verificados; valores antigos não retornam à UI | Pendente |
| P16 | Publicar políticas com canais e fornecedores reais | Gestor/privacidade/técnico | URLs públicas sem login e conteúdo validado | Pendente de publicação/canais |
| P17 | Inscrever webhook no app e WABA | Admin Meta/técnico | Challenge aceito; evento real do número chega ao ERP | Pendente |
| P18 | Preparar modelo aprovado e consentimento de teste | Atendimento/admin Meta | Modelo compatível/idioma/variáveis aprovados e autorização verificável | Pendente |
| P19 | Testar envio e recepção reais | Atendimento/técnico | Mensagens entre ERP e WhatsApp de teste, IDs/status registrados sem conteúdo excessivo | Pendente |
| P20 | Testar recusa/exclusão/reativação controlada | Privacidade/técnico | Bloqueio, remoção e supressão confirmados | Pendente remoto |
| P21 | Configurar retenção, backups e acompanhamento de pedidos | Gestor/admin banco/privacidade | Rotina agendada, teste de restauração e responsabilidades | Pendente |
| P22 | Conferir custos, limites e plano dos fornecedores | Gestor/admin plataformas | Valores/limites vigentes confirmados nas contas | Pendente |
| P23 | Confirmar nível de acesso/revisão Meta aplicável | Admin Meta | Exigência do painel documentada e submissão apenas se necessária | Pendente |
| P24 | Validar aceite final de operação | Gestor + técnico + privacidade | Critérios da seção 8 cumpridos | Pendente |

Não alterar “Pendente” para “Concluído” apenas porque o código existe. Registre data, responsável e evidência observada. Os testes locais demonstram as regras do aplicativo; os testes externos demonstram a instalação.

## 4. Sequência recomendada

### Etapa A — Dados e acessos

O gestor confirma os contatos da empresa, designa responsáveis e concede acesso aos projetos e ao DNS. Decide quem terá conta interna e quem poderá enviar mensagens. Confirma horário e forma de escalonamento humano; o sistema não inventa horário de atendimento.

Entrega esperada: P01–P05 definidos, acesso administrativo autorizado e canais de contato disponíveis. Use dados fictícios enquanto a implantação estiver incompleta.

### Etapa B — Banco e aplicação

1. Criar projeto Supabase e escolher a região; registrar plano, custos e política de backup. A existência de São Paulo entre as opções não significa que a região já foi selecionada.
2. Aplicar, na ordem, `001_auth.sql`, `002_whatsapp.sql`, `003_meta_deletion.sql`, `004_integration_settings.sql`, `005_integration_manager.sql`, `006_erp.sql` e `007_workspace_access.sql` de `supabase/migrations/`.
3. Conferir que os esquemas do ERP não estão expostos ao navegador via Data API e que `anon`/`authenticated` não receberam acesso indevido. O app usa autenticação própria, não Supabase Auth.
4. Copiar do painel Connect a conexão adequada ao ambiente serverless, com host/usuário/porta corretos; configurar TLS e credencial privada em `DATABASE_URL`.
5. Configurar a Vercel com projeto e ambientes separados, chave `INTEGRATION_ENCRYPTION_KEY` de 32 bytes em base64, allowlist `INTEGRATION_MANAGER_EMAILS` e origem de autenticação `AUTH_ORIGIN`. Preview não deve usar o banco de clientes automaticamente.
6. Publicar `app.ateliemilenakerbage.com.br`, configurar DNS conforme os valores exibidos pela Vercel e verificar HTTPS. Não inventar IP ou CNAME.
7. Criar o usuário interno inicial no ambiente correto e verificar login, logout e persistência do banco.
8. Conferir build, logs sem segredos e acesso público às políticas.

Entrega esperada: P06–P10 e P16 comprovados. O banco deve permanecer consistente entre invocações serverless; arquivo SQLite em `/tmp` ou no diretório do deploy não é banco de produção.

### Etapa C — Meta e número

1. Criar/configurar o portfólio empresarial e aplicativo adequado.
2. Confirmar dados legais, perfil, proprietário e requisitos que o painel mostrar.
3. Usar primeiro o número/ativos de teste oferecidos pelo painel, se disponíveis, com destinatário que autorizou a experiência.
4. Definir o número operacional do Ateliê e analisar o fluxo atual antes de migrar número já utilizado no Business App. Não presumir transferência de histórico nem coexistência universal.
5. Obter IDs e token com permissões necessárias; guardar pelo painel e configurar versão Graph explicitamente suportada, não uma versão retirada de tutorial antigo.
6. Guardar App Secret, gerar/informar Verify Token e configurar callback, URLs de políticas e exclusão. A geração local de Verify Token/supressão não emite token Meta.
7. Inscrever o app no campo `messages` e na WABA pertinente; salvar callback sem conferir a inscrição não basta.
8. Conferir cobrança, qualidade, modelos e limitações da conta.

Entrega esperada: P11–P18 e P22–P23 comprovados. Nenhuma credencial real da Meta foi fornecida ou criada nesta tarefa.

### Etapa D — Teste controlado e rotina

Execute os testes da seção 7 com contato autorizado. Teste a recusa e a exclusão com registros fictícios. Configure manutenção de retenção em períodos sem tráfego e rotina de revisão dos protocolos Meta. Complete o aceite final antes de atender clientes reais.

## 5. Informações a fornecer ao implementador

### Públicas

- Identidade empresarial e endereço conferidos.
- Acompanhamento e teste de recebimento/resposta da caixa confirmada `milenakerbageatelie@gmail.com`, utilizada para suporte e privacidade.
- Telefone oficial com DDI e identificação do número usado no teste.
- Horário de atendimento, responsável pela fila e caminho para atendimento humano.
- Confirmação da origem `https://app.ateliemilenakerbage.com.br`.
- Decisões de retenção e categorias de mensagem autorizadas.

### Privadas, pelo ambiente apropriado

- Convite de acesso ao projeto Vercel e Supabase.
- Acesso autorizado ao DNS e ao portfólio/aplicativo Meta.
- `DATABASE_URL` e certificado/configuração TLS quando necessário.
- `INTEGRATION_ENCRYPTION_KEY` e lista de e-mails de gestores no ambiente privado, além da `AUTH_ORIGIN` da autenticação.
- Token emitido pela Meta e App Secret guardados pelos campos protegidos do painel; Verify Token e segredo estável de supressão preparados para suas finalidades.
- IDs de WABA e Phone Number ID e versão Graph conferida.
- Provedor/remetente/credenciais de e-mail transacional, se houver recuperação por e-mail.

O documento contém os **nomes** das variáveis, sem seus valores secretos. Inserir os valores no painel sensível/cofre correto. Não compartilhar senha de pessoa física para administrar a plataforma.

## 6. URLs a publicar e informar à Meta

| Campo ou finalidade | URL |
| --- | --- |
| App URL | `https://app.ateliemilenakerbage.com.br/` |
| Login de avaliação | `https://app.ateliemilenakerbage.com.br/login` |
| Conversas | `https://app.ateliemilenakerbage.com.br/conversas` |
| Diagnóstico da integração | `https://app.ateliemilenakerbage.com.br/configuracoes/whatsapp` |
| Webhook WhatsApp | `https://app.ateliemilenakerbage.com.br/api/whatsapp/webhook` |
| Privacy Policy URL | `https://app.ateliemilenakerbage.com.br/privacidade` |
| Terms URL | `https://app.ateliemilenakerbage.com.br/termos` |
| Instruções de exclusão | `https://app.ateliemilenakerbage.com.br/exclusao-de-dados` |
| Callback de exclusão Meta | `https://app.ateliemilenakerbage.com.br/api/meta/data-deletion` |
| Retorno OAuth opcional | `https://app.ateliemilenakerbage.com.br/api/whatsapp/management/oauth/callback` |
| Central de políticas | `https://app.ateliemilenakerbage.com.br/politicas` |
| Cookies | `https://app.ateliemilenakerbage.com.br/cookies` |
| Comunicação | `https://app.ateliemilenakerbage.com.br/politica-de-comunicacao` |

Esses endereços são a configuração planejada e precisam ser publicados/testados. O acompanhamento de exclusão recebe um protocolo privado aleatório, gerado pelo callback; não há um código padrão a publicar.

## 7. Testes de aceite do ambiente real

| Teste | Resultado que deve ser observado |
| --- | --- |
| Políticas públicas | Seis páginas abrem sem login, mostram identidade e canais válidos, sem dados privados |
| Sessão | APIs internas recusam usuário sem sessão; logout revoga o acesso |
| Persistência | Dados e limitadores PostgreSQL sobrevivem a novas invocações/deploy conforme o contrato |
| Diagnóstico | Configuração completa e resposta Meta com número e app da WABA correta |
| Handshake | Verify Token aceito e `hub.challenge` devolvido |
| Assinatura | POST sem assinatura ou com corpo adulterado recusado |
| Recepção | Mensagem real do contato de teste aparece uma vez no ERP |
| Autorização | Origem/evidência verdadeira registrada antes de envio |
| Texto | Enviado dentro da janela, chega ao WhatsApp e status evolui |
| Template | Modelo aprovado, idioma e variáveis compatíveis, entrega comprovada |
| Janela | Texto livre fora de 24h é bloqueado |
| Duplicata | Repetição da mesma operação não gera novo POST/mensagem |
| Resultado incerto | Timeout/inconclusão não provoca repetição automática cega |
| Recusa | SAIR/PARAR bloqueia; pedido em outras palavras é atendido manualmente |
| Exclusão | Contato/histórico removidos; eventos novos não recriam contato suprimido |
| Meta deletion | Protocolo pendente criado; identidade Meta não é tratada como telefone |
| Mídia | Só sessão válida; tamanho/tipo/host permitidos; sem salvar binário no backend |
| Retenção | Rotina remove registros vencidos no ambiente isolado e é agendada para períodos sem tráfego |
| Restauração | Procedimento mantém recusas/exclusões antes de retomar operação |

Use conta e dados isolados. Não fazer ensaios de exclusão ou de avanço de relógio no banco de clientes. Não coletar print com access token, senha, documentos ou conversas particulares.

Para verificações locais, consulte os comandos no manual. `npm run whatsapp:check` mostra pendências; `--remote` consulta diagnóstico e não envia mensagem. `npm run whatsapp:maintenance` executa retenção. `npm run meta:deletion -- list` consulta pedidos e o comando `complete` registra revisão humana; ele não elimina dados por si só.

## 8. Critério de liberação

### Liberar teste externo

- [ ] Banco Supabase e migrações conferidos, segredo privado e TLS válido.
- [ ] Aplicação Vercel publicada com domínio/HTTPS e sessão funcionando.
- [ ] Políticas públicas e canais reais disponíveis.
- [ ] App/WABA/número/token Meta e inscrição corretos.
- [ ] Destinatário de teste e autorização documentada.
- [ ] Recepção e envio reais comprovados com estado correto.

### Liberar atendimento de clientes reais

- [ ] Todos os critérios de teste externo cumpridos.
- [ ] Custos, limites, situação do número e exigência de revisão/verificação conferidos na conta.
- [ ] Responsáveis por atendimento, direitos e incidentes designados.
- [ ] Consentimento e categorias definidos; modelo global atual não usado para fingir controle independente por categoria.
- [ ] Retenção agendada, backups/ciclo/restauração definidos e testados.
- [ ] Contratos dos fornecedores e transferências internacionais avaliados.
- [ ] Recusa e exclusão comprovadas no ambiente publicado.
- [ ] Conta de avaliação/dados de teste retirados ou mantidos apenas pelo período necessário.
- [ ] Aprovação operacional registrada pelo gestor, técnico e responsável por privacidade.

Não há garantia de aprovação Meta por publicar textos completos. A submissão deve corresponder ao produto real e ao nível de acesso que a conta exigir. O aplicativo é de ativos próprios; não anunciar onboarding de terceiros, Embedded Signup ou criação de templates que não foram implementados.

## 9. Custos, limitações e decisões do gestor

A janela de 24 horas não significa, por si só, que mensagens são gratuitas. Tarifas Meta, planos Vercel/Supabase, backup, e-mail e domínio precisam ser confirmados nas contas na data da ativação. As páginas oficiais de pricing Meta tiveram bloqueio de acesso na pesquisa; nenhum preço atual foi confirmado nesta entrega.

Downloads de mídia respeitam o limite menor da aplicação e da hospedagem. A documentação Vercel consultada informa limite de 4,5 MB para corpo/resposta de função; o código limita o download a 3 MiB quando está na Vercel e a 16 MiB fora dela. Arquivos maiores exigem outro procedimento autorizado; não prometer download de todo anexo do WhatsApp por este caminho.

O sistema restringe administração da integração pela lista de e-mails de gestores e protege credenciais persistidas com criptografia. Não oferece um modelo completo de autorização por função para todo o ERP, MFA obrigatório, fila distribuída de envios, alerta automático de pedido Meta ou consentimento separado por categoria. O gestor deve limitar o acesso interno e definir procedimentos adequados. Novas funcionalidades podem exigir novo desenvolvimento e revisão das políticas.

Autorização pelo Facebook é opcional e depende de app com fluxo de login habilitado, callback registrado e permissões disponíveis, além da habilitação técnica da instalação. Ela não cria automaticamente WABA/número nem um token permanente de sistema. A solicitação de maior duração só se aplica a token USER válido do app quando a Meta aceitar a troca; não há refresh ilimitado. O guia do painel detalha a alternativa de token emitido no portal Meta e salvo de forma protegida.

## 10. Fontes primárias para a implantação

- [WhatsApp Business Messaging Policy](https://whatsappbusiness.com/policy/): regras de comunicação, autorização, recusa e privacidade.
- [Overview oficial Meta no Postman](https://www.postman.com/meta/whatsapp-business-platform/overview): referência da integração oficial.
- [Supabase: conexão PostgreSQL](https://supabase.com/docs/guides/database/connecting-to-postgres): pooler, conexão e TLS.
- [Supabase: segurança dos dados](https://supabase.com/docs/guides/database/secure-data): diferença entre acesso de servidor e Data API.
- [Supabase: regiões](https://supabase.com/docs/guides/platform/regions): seleção e limites da residência de dados.
- [Vercel: limites de funções](https://vercel.com/docs/functions/limitations): limites a confirmar na implantação.
- [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm): transparência, direitos e tratamento de dados.

Os detalhes da pesquisa, as três passagens de conferência e as páginas que permaneceram inacessíveis estão na matriz do manual técnico. A indisponibilidade de uma página não foi apresentada como leitura concluída.
