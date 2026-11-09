# Mapeamento e otimização do ERP e da loja

Análise de 8 de novembro de 2026. A arquitetura indicada para manter o custo baixo é PostgreSQL/Supabase para dados de negócio, Cloudflare R2 Standard para mídia pública e CDN para entregar arquivos. Os 2–5 GB previstos de fotos e vídeos cabem na faixa gratuita do R2, desde que o consumo total de armazenamento e operações permaneça dentro das franquias. Gravar esse volume em BYTEA no PostgreSQL ultrapassaria a cota gratuita do banco.

As alterações estão no checkout local. A hospedagem atual foi mantida; bucket e DNS não foram alterados. As migrações 001–014 foram aplicadas no banco configurado e a verificação confirmou 59 tabelas com RLS. A integração R2 está implementada, com ativação pendente da criação dos buckets e das credenciais. Consulte [Cloudflare R2 e compressão nativa](cloudflare-r2-e-imagens.md).

## Stack e divisão do sistema

| Camada | Implementação encontrada | Papel e consumo |
| --- | --- | --- |
| Aplicação | Next.js 16.4.3 App Router, React 19.2.8, TypeScript, Node.js a partir de 22.13 | Loja e ERP compartilham o deploy; parte pública estática, demais páginas e APIs no servidor |
| Interface | Panda CSS, Emotion, Phosphor, Recharts | Estilos, ícones e gráficos; a CDN acelera o download, mas a execução do JavaScript depende do aparelho |
| PostgreSQL | Supabase acessado por `pg`, sem ORM ou Data API | Quatro esquemas privados: `erp_auth`, `erp_core`, `erp_whatsapp`, `erp_meta` |
| Pool | Um pool compartilhado entre domínios por connection string no processo | `DATABASE_POOL_MAX` padrão 1 por instância; TLS verificado; Transaction Pooler recomendado em produção |
| Autenticação | Senhas scrypt, sessões opacas HttpOnly, papéis da equipe, contas separadas da loja | Autenticação própria; não usa Supabase Auth nem chave pública/service role |
| CRM e operações | Leads, conversas internas, clientes, agenda, orçamentos, pedidos, produção, estoque, financeiro, relatórios | Revisões impedem alterações perdidas; transações e bloqueios preservam operações de negócio |
| Administração | Funis, equipe, preferências, perfil, acessibilidade, integrações, API keys, webhooks e notificações | Dados privados; cache público não é apropriado |
| Loja pública | Home, categorias, busca, produtos, projetos personalizados, montador, carrinho, checkout e páginas institucionais | Catálogo no PostgreSQL com cache por tag e fallback em módulos TypeScript |
| Loja com banco | Avaliações e fotos, contas, sessões, cupom de boas-vindas e pedidos | Escritas reais no servidor; moderação invalida cache das avaliações |
| Integrações | WhatsApp Cloud API e webhooks Meta; Instagram; SMTP opcional; serviços de localização | WhatsApp consulta dados com polling; CEP e feed já possuem estratégias de cache |
| Arquivos atuais | `public/vitrine`; fotos de avaliações, perfis e anexos legados em BLOB/BYTEA | Cliente S3/R2 integrado; compatibilidade com binários legados no banco |
| Testes | Node Test Runner, SQLite e PostgreSQL isolado com PGlite | Permitem validar fluxos sem gravar testes no Supabase real |

O roteamento em `src/proxy.ts` e `src/loja/proxy.ts` usa o host: domínio principal e `www` abrem a loja; `erp` e hosts não reconhecidos abrem o sistema interno. Na loja, `/produto/...` é reescrito internamente para `/loja/produto/...`. Um serviço de CDN precisa preservar essa separação.

O inventário reproduzível contém **97 páginas e 112 handlers**, além de layouts, proxy e metadados: [rotas completas](mapa-rotas.md) e [imports e módulos SQL](mapa-sistema.json). Regere com `node scripts/map-system.mjs`. A quantidade de chamadas SQL depende do caminho executado, permissões, paginação e estado; o inventário estático não representa um trace de produção.

A migração `010_loja_gestao.sql` acrescenta 15 tabelas de catálogo, opções, imagens, menu, coleções, cupons e carrinhos. Elas não estavam na medição inicial de 42 tabelas abaixo, mas agora estão aplicadas. As migrações 012 e 014 integram referências ao R2 e variantes de imagens. As alterações concorrentes do catálogo foram preservadas.

## Medição inicial do banco conectado

Acesso somente de leitura com `npm run db:check` e `npm run db:usage`, em 08/11/2026, aproximadamente 18h47 no horário de São Paulo:

| Medida | Resultado |
| --- | --- |
| Banco completo, incluindo estruturas gerenciadas | 13.006.515 bytes, aproximadamente 12,4 MiB |
| Tabelas dos quatro esquemas ERP, incluindo índices | 1.490.944 bytes, aproximadamente 1,42 MiB |
| Tabelas da aplicação | 42, todas com RLS habilitado |
| Exposição | Sem concessões de esquema/tabela para `anon`, `authenticated` ou `PUBLIC` |
| Contagens operacionais consultadas | 4 usuários, 3 funis; zero leads, registros operacionais e contatos WhatsApp |

O banco está pequeno. As estatísticas de leitura são cumulativas e as estimativas de linhas podem estar atrasadas. Esses números não medem a franquia de tráfego mensal nem substituem o painel de cobrança do Supabase. Há poucos dados operacionais para estimar capacidade ou prometer uma porcentagem de melhoria de latência.

O novo `npm run db:usage` mostra tamanho, maiores tabelas, índices, estatísticas agregadas e conexões. Não imprime credenciais, registros ou SQL de usuários. Ele executa as consultas em transação `READ ONLY`.

## Alterações de requisições e consultas

| Fluxo | Alteração aplicada | Efeito esperado |
| --- | --- | --- |
| Limites de autenticação, ERP, loja e WhatsApp | Contador persistente com um UPSERT atômico e `RETURNING`; limpeza global limitada a uma vez por minuto por instância/tabela | Caminho aquecido passa de DELETE + INSERT + SELECT para uma instrução de negócio; limite continua compartilhado entre instâncias |
| Sessões com renovação de atividade | Validação e atualização em um `UPDATE ... RETURNING` | Uma instrução no lugar de SELECT + UPDATE; sessão expirada ou revogada não é reativada |
| Renderizações autenticadas | `React.cache` em `getSession` | Deduplicação dentro do render, sem cache compartilhado de identidade entre requisições |
| Inicialização do ERP | Promessa compartilhada durante a inicialização | Requisições simultâneas no mesmo processo não repetem o bootstrap |
| Configuração inicial do navegador | Reaproveita equipe e usuário já presentes em `/workspace` | Remove o GET redundante de `/team` na carga inicial |
| CRM após alterar etapa, ficha, nota ou anexo | Recarrega somente `/leads/[id]` e mescla a ficha confirmada; arquivamento remove a ficha após confirmação | Evita transferir novamente todo o CRM a cada edição; carga inicial e criação atualizam uma página limitada de resumos, sem histórico completo |
| Snapshot com mais de 500 leads | Filtro por lista JSON de IDs em notas e metadados de anexos | Elimina o fallback que lia notas/anexos de leads fora do conjunto solicitado |
| Contagem WhatsApp no menu | Endpoint `/api/whatsapp/unread`, intervalo nominal de 30 segundos | Cerca de 120 chamadas/hora/aba visível em vez de 240, sem buscar toda a configuração da integração |
| Polling de menu e atendimento | Pausa offline/em aba oculta; execução sequencial e recuo exponencial até 120 segundos em falhas | Reduz tráfego ocioso e repetição durante indisponibilidade; requisição já iniciada pode terminar ao ocultar a aba |
| Manutenção WhatsApp | Checagem de retenção compartilhada por até um minuto por processo | Evita SELECT de manutenção em cada polling; prazo de checagem pode acrescentar até um minuto ao intervalo existente |
| Status WhatsApp | Reaproveita a origem pública já carregada | Remove releitura da configuração para montar URLs |
| Exclusão de contato WhatsApp | DELETE de status pendentes com subconsulta | Uma instrução em vez de uma exclusão por mensagem |
| Clientes HTTP do ERP e WhatsApp | Unem GETs simultâneos sem AbortSignal; escritas invalidam leituras pendentes | Reduz duplicações sobrepostas; não mantém respostas prontas nem compartilha cancelamento |
| Notificações | Consulta somente nomes da equipe e estados dos últimos 100 eventos | Evita carregar perfis completos, presença e todos os estados históricos |
| Avaliações públicas | Página inicial e GET padrão compartilham cache por produto por 600 segundos | Consultas livres continuam diretas, evitando uma chave persistente por busca/filtro; moderação preserva invalidação por tag |
| Resumo das avaliações | Agrupa nota e destinatário em uma consulta | Uma agregação em vez de duas, com mesmas médias e contagens |
| Revisão do workspace | Atualização com `RETURNING revision` | Elimina SELECT posterior |
| Índices PostgreSQL | Migração `011_performance.sql` | Índices para expiração, sessões por usuário, cursor de mensagens, não lidas, contatos ativos, retenção e vínculo de funil |

Contagens de instruções de negócio não incluem `BEGIN`, `SET LOCAL search_path` e `COMMIT` do adaptador `pg`. Esse isolamento foi preservado para o Transaction Pooler; remover o controle de esquema sem substituir sua garantia poderia direcionar consultas ao esquema incorreto. O limite de conexões também continua por instância, e não por deploy inteiro.

O projeto não habilita `cacheComponents`. Foi mantido seu modelo de cache atual, conforme o guia local do Next.js instalado: `unstable_cache` permanece compatível nesse modelo, embora a documentação recomende `use cache` para projetos com Cache Components. Não houve migração global de renderização.

## CDN e storage gratuitos indicados

| Serviço | Uso indicado neste sistema | Franquia e condição |
| --- | --- | --- |
| Cloudflare Free | DNS, HTTPS e CDN dos arquivos públicos | Plano gratuito; acelera entrega de arquivos cacheáveis, sem substituir o servidor Next.js. [Plano](https://www.cloudflare.com/plans/free/) |
| Cloudflare R2 Standard | Fotos e vídeos públicos da loja em `midia.ateliemilenakerbage.com.br` | 10 GB-mês, 1 milhão de operações classe A e 10 milhões classe B por mês; saída de dados sem tarifa de egress. Excedentes de armazenamento/operações são cobrados. [Preços](https://developers.cloudflare.com/r2/pricing/) |
| Supabase Free atual | Dados de negócio e sessões | 500 MB de banco, 1 GB de arquivos, 5 GB de egress e 5 GB de cached egress; pausa após uma semana de inatividade. O storage gratuito não comporta 2–5 GB. [Limites](https://supabase.com/pricing) |
| Netlify Free como alternativa de hospedagem | Avaliar uma prévia do Next.js com CDN nativa | Permite projetos comerciais, com limite de 300 créditos/mês compartilhados por deploys, computação, tráfego e requisições; projetos pausam ao esgotar a franquia. [Uso comercial](https://www.netlify.com/blog/introducing-netlify-free-plan/), [preços](https://www.netlify.com/pricing/), [limite](https://www.netlify.com/pricing/pro-vs-free/) |

A faixa gratuita do R2 se aplica à classe **Standard**, não a Infrequent Access. Inclua originais, versões otimizadas e miniaturas no total. A ativação envolve uma assinatura de uso do R2 e pode exigir cadastro de pagamento; não é uma promessa de serviço ilimitado ou de bloqueio automático de cobrança ao chegar à franquia. [Ativação](https://developers.cloudflare.com/r2/get-started/).

A documentação da Netlify oferece suporte ao Next.js via OpenNext, com cache e otimização de imagens. A compatibilidade deste projeto deve ser validada em uma prévia, incluindo `pg`, `node:sqlite`, `sharp`, proxy por host, callbacks, corpos multipart e funções após a resposta. A prévia ainda não foi implantada. [Next.js na Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/).

**Vercel Hobby não é uma opção gratuita indicada para esta loja comercial**: o plano é destinado a uso pessoal não comercial. Se o deploy já está no Pro, a CDN nativa é útil e o R2 pode ser usado apenas para mídia, sem mudança de hospedagem. [Condição de uso](https://vercel.com/pricing).

## Configuração da CDN e dos arquivos

1. Na Cloudflare, adicionar o domínio existente ao plano Free e manter os registros DNS necessários à hospedagem atual. Usar HTTPS com validação do certificado de origem. A CDN não hospeda o processo Node do ERP.
2. Criar dois buckets R2 **Standard** separados, privado e público. No público, conectar `midia.ateliemilenakerbage.com.br`; o privado permanece sem domínio público. Usar domínio próprio em produção: `r2.dev` é destinado a desenvolvimento e não oferece o mesmo cache. [Buckets públicos](https://developers.cloudflare.com/r2/buckets/public-buckets/).
3. Configurar as variáveis de servidor e CORS conforme o [guia de ativação](cloudflare-r2-e-imagens.md). Enviar fotos de produtos pelo editor do e-commerce, para manter vínculo e compressão. A biblioteca em Configurações → Fotos e vídeos publica outras mídias. O registro estático em `src/loja/lib/catalogo/fotos.ts` continua como compatibilidade para fotos antigas.
4. Definir `NEXT_PUBLIC_LOJA_MEDIA_ORIGIN=https://midia.ateliemilenakerbage.com.br` no ambiente de build. A URL é pública, não uma credencial. Fazer novo build. O código já usa essa origem para as fotos registradas e autoriza somente seu domínio e `/vitrine/**` no `next/image`. Vazio mantém os arquivos locais.
5. Usar nomes com versão/hash em novos arquivos públicos. Para nomes imutáveis, configurar `Cache-Control: public, max-age=31536000, immutable`; ao substituir conteúdo no mesmo nome, fazer purge ou usar TTL menor. O Next/Image pode servir a versão otimizada pela CDN da hospedagem; apontar ao R2 não remove automaticamente as cotas de otimização de imagens dessa hospedagem.
6. Na CDN da aplicação, manter cache de arquivos estáticos e respeitar a política de origem. Não configurar uma regra global que force cache de HTML/API. ERP, login, conta, pedidos e demais dados privados exigem bypass de cache público; a loja também define cookies de rastreamento, e respostas RSC variam por cabeçalhos e `_rsc`. O cache de HTML deve ficar inicialmente sob controle da plataforma Next.js. [Comportamento da CDN](https://developers.cloudflare.com/cache/concepts/default-cache-behavior/).
7. As novas fotos já recebem WebP/AVIF e miniaturas automaticamente. Para vídeos curtos, enviar MP4 otimizado, usar imagem de capa e `preload="none"` ou `metadata`; carregar quando necessário. Testar seek e respostas Range no domínio de mídia. R2 armazena arquivos, sem fornecer automaticamente transcodificação ou streaming adaptativo. [Range](https://developers.cloudflare.com/cache/reference/range-requests/).
8. Manter comprovantes, anexos internos e mídia pendente de moderação no bucket privado. Os uploads já validam autenticação e conteúdo; a biblioteca utiliza URLs assinadas curtas. O comando de limpeza revisa objetos privados sem referência, com dry-run por padrão.

A integração R2 já cobre uploads e leituras de avaliações, produtos, perfis e anexos. Arquivos legados permanecem legíveis, e `storage:migrate` permite transferi-los com verificação de integridade após a criação do bucket. A biblioteca de Fotos e vídeos faz upload direto e publicação das mídias públicas. Não colocar chaves S3 em variáveis `NEXT_PUBLIC_`.

## Paginação do CRM e agregação dos relatórios

O CRM carrega páginas de 50 resumos, com busca, filtros e ordenação aplicados no SQL antes do limite. Na ordenação por criação, um cursor de data/ID evita pular registros se uma ficha nova entrar antes da página atual. As próximas páginas não repetem a contagem global. Totais e valores por etapa são agregados no banco. Notas completas e metadados de anexos são carregados ao abrir a ficha; a listagem recebe somente a prévia mais recente.

Clientes, kanban, arquivados e conversas têm controles para carregar mais resultados. A busca global consulta o servidor, incluindo trechos de notas antigas, e as opções de vínculo das operações recebem somente ID/nome/telefone. Exportações da tabela usam os registros carregados/selecionados.

Os relatórios agregam contagens, finanças, fontes e funis no SQL. O resumo do dashboard é independente da lista paginada, para não calcular indicadores com uma página parcial. Materiais abaixo do mínimo têm contagem global e amostra de até 50 registros; a listagem operacional permite consultar o restante. A atividade do painel é limitada a 50 eventos recentes, e o quadro de atenção recebe até cinco fichas com contagem global separada.

A hospedagem recebe resultados pequenos em vez de todos os documentos de negócio. Consultas por filtros ainda precisam examinar os registros correspondentes; paginação não elimina o custo de agregações exatas. Os índices da migração 013 apoiam cursor, funil, período financeiro e atividade recente. As verificações de autorização e revogação permanecem junto aos dados, sem cache público de sessões.

## Compressor e armazenamento externos

Fotos de avaliações, produtos, perfis e anexos raster agora passam pelo compressor nativo. Ele produz WebP e AVIF com miniaturas, usando compressão mais forte nas avaliações e qualidade maior nos produtos. No R2, o banco guarda referências e metadados; legados em BYTEA permanecem legíveis. Tamanhos e datas dos novos metadados usam BIGINT, sem converter imagens em Base64. Os parâmetros, a ativação da CDN, o CORS e os comandos de migração/limpeza estão no [guia de R2 e imagens](cloudflare-r2-e-imagens.md).

## Validação

O primeiro typecheck e build de produção passaram. Passaram também testes de autenticação, ERP, WhatsApp, loja, avaliações, contas, testes novos de polling/deduplicação/limite e testes isolados com PostgreSQL/PGlite. Os testes novos verificam concorrência do contador, reinício após expiração, uma instrução no caminho aquecido, idempotência dos índices, pausa offline/oculta, recuo em falhas e independência de cancelamento das requisições.

A validação final também inclui build/typecheck após integrar o compressor, quatro testes reais dos codecs com sharp, seis testes de storage com SDK simulado e PostgreSQL isolado, paginação/agregação do CRM e os 12 testes da gestão com PostgreSQL. O smoke HTTP autenticado de produção usa SQLite temporário: verifica páginas, cursor, filtros, dashboard/relatórios e fotos de perfil negociadas em AVIF/WebP. A duplicação e exclusão de fotos de produtos verificam preservação dos formatos e liberação da última referência no storage.

Na checagem HTTP do build local de produção, a home pública retornou 200 com cache de página estática, a busca retornou 200 com `s-maxage=3600`, e `/api/whatsapp/unread` e `/api/erp/workspace` retornaram 401 sem sessão, com cache público desabilitado. Não foi medida latência de usuários reais nem um teste de carga no Supabase gratuito.


Os erros de build nas chamadas do catálogo e nos componentes em edição foram corrigidos. As migrações e índices estão aplicados no banco real; os testes de escrita usam bancos isolados. A criação dos buckets e a configuração de credenciais/domínio Cloudflare continuam pendentes, conforme a situação informada pelo proprietário.
