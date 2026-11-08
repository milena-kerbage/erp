# Loja (e-commerce) do Ateliê Milena Kerbage

Loja de **enxoval e quarto de bebê** (kit berço, paninhos, quarto, maternidade e projetos de quartinho), com peças a pronta entrega e sob encomenda feitas no ateliê em Fortaleza/CE e entrega para todo o Brasil (perfil oficial: [@milenakerbageatelie](https://www.instagram.com/milenakerbageatelie/)).

A loja e o ERP rodam no **mesmo projeto Next.js e no mesmo deploy da Vercel**, separados pelo domínio:

| Host | Abre | Observações |
|---|---|---|
| `ateliemilenakerbage.com.br` e `www.ateliemilenakerbage.com.br` | Loja | Pública e indexável. Origem canônica: `https://www.ateliemilenakerbage.com.br` |
| `erp.ateliemilenakerbage.com.br` | ERP | Login obrigatório, `noindex`. `AUTH_ORIGIN` e `PUBLIC_BASE_URL` apontam para cá |
| Qualquer outro (`localhost`, `127.0.0.1`, IP da rede, prévias `*.vercel.app`) | ERP | Para abrir a loja numa prévia, inclua o host em `LOJA_HOSTS` |

A lista de hosts fica em [`src/lib/hosts.ts`](../src/lib/hosts.ts). Ela é a fonte única usada pelo proxy, pelo `next.config.ts` (cabeçalhos por host) e pelo `robots.txt`.

## Desenvolvimento local

```bash
npm run dev
```

- Loja: http://www.localhost:3000 (o navegador resolve `*.localhost` para a própria máquina).
- ERP: http://localhost:3000 (origem do `AUTH_ORIGIN` local).

## Como a separação funciona

1. [`src/proxy.ts`](../src/proxy.ts) lê o host. No host da loja, entrega a requisição a [`src/loja/proxy.ts`](../src/loja/proxy.ts); nos demais, segue a autenticação do ERP.
2. O proxy da loja reescreve a URL pública para a rota interna: `/produto/x` vira `/loja/produto/x`. O visitante nunca vê `/loja`. Quem digita `/loja/...` é redirecionado (308) para a URL pública.
3. O proxy da loja também aplica o redirecionamento canônico das listagens (308) e grava os cookies de atribuição (UTMs, IDs de clique, visitante e sessão).
4. No host do ERP, `/loja/*` e `/vitrine/*` respondem 404.

Cada lado tem o seu próprio **root layout**, então os estilos não se misturam:

| | ERP | Loja |
|---|---|---|
| Rotas | `src/app/(erp)/**` e `src/app/api/**` | `src/app/(site)/loja/**` (APIs em `/loja/api/*`, públicas como `/api/*`) |
| Root layout | `src/app/(erp)/layout.tsx` | `src/app/(site)/layout.tsx` |
| Código | `src/components`, `src/features`, `src/lib`… | `src/loja/{componentes,lib,estilos}` |
| Estilos | Emotion (`src/styles/theme.ts`) | Panda CSS (`panda.config.ts`), CSS gerado no build e sem JavaScript de estilo |
| Arquivos públicos | `public/*` | `public/vitrine/*` |

O `robots.txt` (`src/app/robots.ts`) varia por host: o da loja libera a indexação e aponta o sitemap, e o do ERP bloqueia tudo.

## Identidade visual

Os tokens ficam em [`panda.config.ts`](../panda.config.ts) e espelham o ERP:
- **Cores:** sálvia da logo (`logo` = `#788569`). Os botões usam `marca` = sage 600 `#616D54`, que tem contraste AA com texto branco. Os fundos usam neutros quentes, e a terracota fica em `promocao`.
- **Fontes:** Inter em todo o texto e em todos os títulos. A Scarlett (`fontFamily: "marca"`) aparece só em frases curtas **sem acento**, porque a fonte não tem acentos nem cedilha.
- **Formas:** controles com cantos de 8 px e superfícies com 12–16 px, como nos mixins do ERP. As fotos dos cards dos carrosséis e os posts do Instagram têm cantos de 12 px (`radii.midia`); as grades de borda a borda (listagem, cards com abas da home, mídias em tela cheia) continuam retas.
- **Regra:** `strictTokens: true`, então valor fora da escala vira erro de tipo. Nunca use cor, fonte ou medida literal num componente.

### Detalhes de ateliê

A estrutura, a grade, os breakpoints e as interações seguem o mesmo esqueleto de antes. A "pele" tem detalhes próprios, de ateliê de costura (sálvia e linho), para a loja não ficar idêntica à referência que serviu de base:

| Detalhe | Onde | Por quê |
|---|---|---|
| **Pesponto**: linha tracejada fina (traço de 6 px, vão de 4 px), como costura aparente | Divisórias do painel de compra (PDP e projeto), faixas e acordeões do rodapé, rodapé da sacola/checkout no celular. Classes em `src/loja/estilos/pesponto.ts`; cores `pesponto` e `pespontoSobreEscuro` | Troca a linha reta genérica por um traço que lembra o acabamento das peças |
| **Sublinhado do menu** em pesponto na sálvia (`marca`) | Itens do menu do desktop (`BarraCabecalho`) | No lugar do traço cinza contínuo |
| **Pílula do cabeçalho** sálvia-linho translúcida (`vidroCabecalho` = sage 100 a 82%) | Desktop | Cor própria em vez do vidro cinza neutro; texto escuro com contraste > 9:1 mesmo sobre o hero |
| **Rubrica** acima dos títulos de seção ("Feito à mão", "Paleta do ateliê", "Mais vendidos", "Pronta entrega", "Para o quartinho", "Primeiros dias", "No Instagram"): caixa alta, entreletra 0,14em, sálvia, com um pespontinho de 24 px antes | Home (`rubrica` em `inicio/estilos.ts`; texto em `conteudo.ts`) | Etiqueta de costura; organiza a página sem mudar a grade |
| **Nomes próprios** das seções: "Recém-saídas da costura" (era "Novidades do ateliê"), "Escolha pela cor" (era "Compre por cor"), "As mais pedidas no ateliê", "Sai do ateliê em até 2 dias úteis" | Home | Tira a tradução literal dos títulos da referência |
| **Selo "Feito à mão"** (agulha + texto, pílula clara) | Canto superior esquerdo da foto dos cards de peças **sob encomenda** (listagem e carrosséis); some quando a cor escolhida é de pronta entrega | Valoriza o feito sob encomenda com discrição |
| **Cantos de 12 px** nas fotos | Cards dos carrosséis (home e "Você também pode gostar") e posts do Instagram | Mais suave, sem mudar proporção nem grade |
| **Bloco em linho** (`linho` = `#F3EFE6`) | Seção do Instagram, a última antes do rodapé | Fundo alternado quente; `marca` tem 4,8:1 e o texto 12:1 sobre ele |
| **Scarlett** em frase curta sem acento ("Cada detalhe, bem cuidado") | Assinatura da seção do Instagram | A fonte da marca aparece onde faz sentido, sem acento |

O `styled-system/` é gerado por `panda codegen`. Ele roda no `prepare` (depois do `npm install`) e no `build`, e fica fora do git.

## Stack e hospedagem

A loja usa a mesma stack do ERP: **Next.js na Vercel e PostgreSQL no Supabase**. A loja da Fast tinha um backend Python (FastAPI, Celery, Redis, motor de imagens e publicação no Merchant), um build `standalone` em Docker e Cache Components. Nada disso foi trazido:
- **Cache Components:** fica desligado. Ele exigiria `<Suspense>` em todo acesso a cookies no ERP. Os 3 usos de `"use cache"` viraram cache de `fetch` (`next.revalidate`) ou cálculo direto.
- **Revalidação:** o webhook de revalidação, que o backend Python chamava, foi removido. Quando o catálogo vier do ERP, a revalidação passa a ser chamada direto do servidor (`revalidateTag`), sem segredo nem chamada externa.
- **Imagens:** ficam com o `next/image` da Vercel. O motor de imagens do backend não é necessário.

## Avaliações de produto

A página de produto mostra só avaliações **reais e aprovadas** no ERP (menu Avaliações). Não há conta de cliente nem compra no site, então não existe "compra verificada": tudo entra como pendente e passa por moderação.

| Peça | Arquivo |
|---|---|
| Regras compartilhadas (limites, validação, filtros) | `src/loja/lib/avaliacoes/regras.ts` |
| Servidor (banco, fotos, moderação) | `src/lib/loja/avaliacoes.ts` |
| Carga da PDP com cache e respostas de erro | `src/loja/lib/avaliacoes/servidor.ts` |
| API pública | `src/app/(site)/loja/api/avaliacoes/route.ts` e `foto/[id]/route.ts` |
| Seção, cards, visualizador e formulário | `src/loja/componentes/produto/Avaliacoes.tsx` e `produto/avaliacoes/*` |
| Moderação no ERP | `src/features/reviews/components/ReviewsModeration.tsx` e `/api/erp/avaliacoes/*` |
| Tabelas | `supabase/migrations/008_loja_avaliacoes.sql` |

API pública (host da loja):
- `GET /api/avaliacoes?produto=<slug>`: só aprovadas, com `ordem=recentes|maior|menor|fotos`, `nota=5,4`, `fotos=1`, `para=menina|menino|surpresa`, `busca=` (sem acento), `offset` e `limite` (até 24). Devolve também o resumo (média, contagem por nota, com fotos e "para quem"). CDN: 60 s.
- `POST /api/avaliacoes` (multipart): `produto`, `nota` (1 a 5), `titulo` (até 80), `texto` (20 a 2000), `nome` (até 40), `cidade` (opcional, até 60), `paraQuem` (opcional), `consentimento`, `iniciado` (ms) e `site` (honeypot), mais de 0 a 4 arquivos em `fotos`.
- `GET /api/avaliacoes/foto/<id>?tamanho=mini|grande`: WebP de avaliação aprovada, com `Cache-Control: public, max-age=31536000, immutable`.

Limites e proteções: foto de até 3 MiB (413), só JPEG, PNG ou WebP pelos bytes mágicos (415), requisição de até 13 MiB (413), honeypot (o robô recebe "sucesso" e nada é gravado), pelo menos 4 s de preenchimento, links recusados no texto, 3 avaliações aceitas por hora por IP (o IP fica só como HMAC e é apagado na moderação ou em 24 h), mais 12 tentativas por hora por IP e 120 por hora no total (`attempts`, o mesmo limitador do login). Envio só da própria origem (403). As fotos são recomprimidas para WebP de 1600 px (q 80) e miniatura de 400 px, sem EXIF, GPS ou ICC.

A Vercel recusa corpos acima de 4,5 MB antes de chegar à função. Por isso o formulário reduz no navegador (2048 px, JPEG 85%) as fotos maiores que 600 KB quando o total passa de 3,8 MB; o servidor confere e recomprime tudo de novo. O `proxyClientMaxBodySize` do `next.config.ts` (14 MB) cobre o proxy fora da Vercel.

A PDP renderiza no servidor a primeira página e o resumo (cache por produto de 10 min, tag `avaliacoes:<slug>`, revalidada na hora pela moderação). O resumo do painel de compra e o JSON-LD (`AggregateRating` e `Review`) só aparecem com avaliação aprovada. Sem nenhuma, o painel mostra "Seja a primeira a avaliar", que abre o formulário.

**Desenvolvimento seguro:** com `npm run dev` ligado a um `DATABASE_URL` remoto (que pode ser o de produção), o `POST` valida e processa tudo, mas não grava nada (nem o contador de tentativas) e responde `{ok, simulada: true}`; o formulário mostra um aviso. Para gravar de propósito nesse cenário, use `AVALIACOES_GRAVAR_EM_DESENVOLVIMENTO=true`. Para testar o fluxo completo sem tocar no Supabase, rode o build com SQLite local, por exemplo `DATABASE_URL= ALLOW_LOCAL_SQLITE=true ERP_DB_PATH=/tmp/erp.sqlite AUTH_DB_PATH=/tmp/auth.sqlite npx next start -p 3100` e abra `http://www.localhost:3100` (a variável vazia impede o `.env.local` de preencher o `DATABASE_URL`).

Testes: `npm run test:avaliacoes` (SQLite) e `npm run test:avaliacoes:postgres` (PGlite com as migrações 006 e 008); as regras puras ficam em `tests/loja/avaliacoes-regras.test.mjs`.

## Instagram (seção da home)

A última seção da home, antes do rodapé, mostra os **posts reais** do perfil [@milenakerbageatelie](https://www.instagram.com/milenakerbageatelie/) pela API oficial (Instagram API with Instagram Login, para conta profissional). Sem token, ou se a API falhar, a seção mostra só o convite para seguir (o @, a frase e o botão "Seguir no Instagram"): nunca posts falsos. O erro vai para o log do servidor e a página não quebra.

| Peça | Arquivo |
|---|---|
| Normalização, filtros e busca (pura, testável) | `src/loja/lib/instagram/feed.ts` |
| Leitura do token e log de erro (servidor) | `src/loja/lib/instagram/servidor.ts` |
| Seção da home (Server Component) | `src/loja/componentes/inicio/Instagram.tsx` |
| Rota das imagens | `src/app/(site)/loja/api/instagram/midia/[id]/route.ts` (pública como `/api/instagram/midia/<id>`) |
| Renovação do token | `scripts/instagram-renovar-token.mjs` (`npm run instagram:renovar-token`) |
| Testes | `tests/loja/instagram.test.mjs` |

**Como funciona.** O servidor chama `GET https://graph.instagram.com/v{INSTAGRAM_GRAPH_VERSION}/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=12` com cache de 1 h (`fetch` com `next.revalidate: 3600` e tag `instagram`) e tempo limite de 5 s. Vídeo e reels usam a capa (`thumbnail_url`); carrossel usa a capa (`media_url`); post sem imagem utilizável fica de fora. A grade mostra 6 posts no celular (3 × 2), 8 no tablet (4 × 2) e 12 no desktop (6 × 2), em 4:5, e cada post abre o permalink numa nova aba.

**Imagens: rota própria, e não `images.remotePatterns`.** As URLs da CDN do Instagram (`scontent*.cdninstagram.com`, `*.fbcdn.net`) expiram e mudam. Se a página (ISR) ou o otimizador de imagens guardassem essa URL, a imagem quebraria um dia. A página só usa `/api/instagram/midia/<id>`, que é estável: a rota aceita só ids do feed atual (não é um proxy aberto), baixa os bytes da URL do feed e, se ela expirou, pede a URL atual pelo id à API (`GET /{id}?fields=media_type,media_url,thumbnail_url`, sem cache) e marca o feed como velho (`revalidateTag("instagram", "max")`). Responde com `Cache-Control: public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400`. De quebra, o visitante não fala com a CDN da Meta.

**Para atualizar na hora** (ex.: depois de um post importante): faça um novo deploy ou chame `revalidateTag("instagram", "max")` num handler do servidor. Sem isso, o feed renova sozinho em até 1 h.

### Como obter o token (uma vez)

1. **Conta profissional:** no app do Instagram, o perfil precisa ser comercial ou de criador (Configurações > Tipo de conta e ferramentas).
2. **App da Meta:** em [developers.facebook.com/apps](https://developers.facebook.com/apps), abra o app já usado para o WhatsApp do ERP (dá para reaproveitar) ou crie um do tipo "Empresa".
3. **Produto Instagram:** em "Adicionar produto", escolha **Instagram** > **API setup with Instagram login** (Instagram API com login do Instagram).
4. **Permissão:** só `instagram_business_basic` (ler o perfil e as mídias). Não peça permissões de publicação, mensagens ou comentários.
5. **Conta do ateliê:** em "Generate access tokens", adicione a conta @milenakerbageatelie (o próprio dono entra com o login do Instagram e autoriza). Enquanto o app estiver em modo de desenvolvimento, a conta precisa estar cadastrada como testadora do Instagram no app (Funções do app) e aceitar o convite no Instagram (Configurações > Apps e sites).
6. **Token de longa duração:** o botão "Generate token" do painel já entrega um token de longa duração (60 dias). Se você tiver um token curto (1 h, vindo do fluxo de login), troque por um longo: `GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=<App Secret do Instagram>&access_token=<token curto>` (feito no servidor ou no terminal; o App Secret nunca vai para o navegador).
7. **Variáveis:** grave `INSTAGRAM_ACCESS_TOKEN` em `.env.local` e na Vercel (Production; Preview se quiser o feed nas prévias). Nunca em `NEXT_PUBLIC_`, nunca em arquivo versionado. Opcional: `INSTAGRAM_GRAPH_VERSION` (padrão `v27.0`; use a versão suportada que aparece no painel da Meta). Faça um novo deploy.
8. **Conferir:** abra a home. Com o token certo, aparecem os posts; com erro, o log do servidor mostra `[instagram] Feed indisponível (erro-api: HTTP 400 código 190 …)` (código 190 = token inválido ou vencido).

### Renovar o token (a cada 60 dias)

O token de longa duração vale 60 dias e pode ser renovado a partir de 24 h de idade, enquanto ainda estiver válido (vencido, só gerando outro no painel):

```bash
npm run instagram:renovar-token              # renova e mostra a nova validade (token mascarado)
npm run instagram:renovar-token -- --gravar  # também grava o novo token em .env.local
npm run instagram:renovar-token -- --mostrar # imprime o token completo para colar na Vercel
```

O script chama `GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=<token atual>` com o `INSTAGRAM_ACCESS_TOKEN` do `.env.local`. Depois, atualize a variável na Vercel e faça um novo deploy. Sugestão: renovar uma vez por mês (lembrete na agenda). Se o token vencer, a home volta sozinha para o convite e o log avisa.

## Removido da loja

- **Faixa promocional do topo** (o aviso escuro acima da pílula, `FaixaPromo.tsx`) e a chave `milena:faixa-promo-fechada` do `sessionStorage`. O hero agora tem 100vh no desktop e 100vh − 56 px no celular.
- **Seção "Atendimento pelo WhatsApp"** da home (cartão de vidro com QR code, `Atendimento.tsx` e `QrCode.tsx`) e a dependência `qrcode-generator`. O WhatsApp continua no rodapé, nos atalhos, na PDP, na sacola e no checkout.
- **Destaques "Do ateliê para a sua casa"** da home (`GrupoDestaques.tsx`).
- **Faixa de marca** ("Cada detalhe, bem cuidado" + "Seguir…"): virou a seção do Instagram.
- **Guia de medidas** (links no menu, na PDP, no montador e no rodapé, a calculadora `src/loja/lib/calculadora/**` e o teste). As medidas de cada tamanho aparecem ao escolher o tamanho na PDP e no montador.
- **Cashback / programa de pontos** (`src/loja/lib/fastclub/**`, o card da home, o teste e o campo `pontos` da confirmação da sacola). A loja não tem programa de pontos: o ponto forte é a indicação (`/indique`).
- **"Entrar" e "Cadastre-se"**: as chaves `entrar` e `cadastro` saíram de `LINKS_UTILITARIOS` (`layout/cabecalho/navegacao.ts`); o ícone de conta e o rodapé usam `conta` ("Minha conta"). Os endereços antigos `/conta/entrar`, `/conta/cadastro` e `/conta/clube` seguem respondendo 308 para `/conta`, para links e favoritos antigos não darem 404.
- "Acompanhe seu pedido" virou **"Pedidos enviados"** (`LINKS_UTILITARIOS.pedido`), que é o que `/conta/pedidos` mostra.

## Rodapé

Três faixas sobre o fundo escuro, separadas por pesponto: (1) destaques — "Indique o ateliê" com botão para `/indique`, o atendimento (botão do WhatsApp, e-mail, horário e cidade) e "Feito à mão em Fortaleza · Entrega para todo o Brasil" com as formas de pagamento só como informação ("5% OFF no Pix · até 10x no cartão · combinado pelo WhatsApp"); (2) o menu em 6 colunas (Comprar, Ajuda, Minha conta, O ateliê, Políticas e Redes sociais), acordeões no celular; (3) a linha legal com "Voltar ao topo". Não há newsletter (a loja não envia e-mails) nem selos de segurança. O horário de atendimento está em `EMPRESA.horarioAtendimento` (`src/loja/lib/empresa.ts`), marcado com `[CONFIRMAR]`.

## Variáveis de ambiente (ver `.env.example`)

| Variável | Uso |
|---|---|
| `LOJA_HOSTS` | Hosts extras que abrem a loja (ex.: prévia da Vercel) |
| `INDEXNOW_CHAVE` | Opcional. Chave do IndexNow servida em `/<chave>.txt` |
| `AVALIACOES_GRAVAR_EM_DESENVOLVIMENTO` | Opcional. `true` libera gravar avaliações com `npm run dev` ligado a um banco remoto (padrão: simula) |
| `INSTAGRAM_ACCESS_TOKEN` | Opcional e **secreta** (só servidor). Token de longa duração da conta @milenakerbageatelie para a seção de Instagram da home. Vazia: a seção mostra o convite para seguir |
| `INSTAGRAM_GRAPH_VERSION` | Opcional. Versão da API do Instagram (padrão `v27.0`) |

## Testes

```bash
npm run test:loja
```

Os testes ficam em `tests/loja/` e cobrem o motor de URLs, o carrinho (com projetos e o quartinho personalizado), o checkout, os pedidos, o rastreamento, a localização, os projetos, o montador "Monte o seu quartinho", a normalização e o fallback do feed do Instagram (`instagram.test.mjs`) e a separação de hosts.

## Pendências

- **Conteúdo provisório:** produtos, preços, projetos de quartinho e pedidos são fictícios, e não há fotos. Cada página mostra um placeholder no lugar da foto. As fotos entram em `public/vitrine/produtos/<slug>/` e `public/vitrine/projetos/<slug>/`.
- **Projetos:** a área `/projetos` é a antiga "Loja de Casas" da base original. O código ainda fica em `src/loja/{componentes,lib}/casas` para manter os imports estáveis. A página do projeto segue a página de produto, e o projeto vai para a MESMA sacola dos produtos (`tipo: "projeto"` no item, com pacote e opcionais). O "Monte o seu quartinho" (`/projetos/monte-o-seu`, regras em `src/loja/lib/casas/modulos.ts`) gera o item `tipo: "personalizado"`. A antiga seleção (`/projetos/selecao`) responde 308 para `/carrinho`, e o `mk_projetos` é migrado para a sacola na primeira visita. O "Monte o seu quartinho" aparece nos destaques do painel "Projetos" do mega menu, nos links secundários das categorias e no rodapé.
- **Catálogo:** ligar ao catálogo do ERP (`erp_core.records`, recurso `catalogo`) e criar pedidos e clientes da loja no ERP.
- **Conta:** não há login. "Minha conta" (`/conta`) mostra os favoritos e os pedidos enviados pelo WhatsApp **neste aparelho** (localStorage `mk_pedidos_enviados`, gravado pelo checkout ao enviar; regras em `src/loja/lib/pedidos/historico.ts`). `/conta/entrar`, `/conta/cadastro` e `/conta/clube` redirecionam (308) para `/conta`.
- **WhatsApp no ERP:** o WhatsApp de vendas, (85) 98582-2208, vem do Instagram e já está em `src/loja/lib/empresa.ts`. Falta preencher `LEGAL_WHATSAPP_PHONE` no ERP com o mesmo número.
- **Instagram:** gerar o token (passo a passo em "Instagram") e combinar quem renova a cada 60 dias. Uma renovação automática (cron da Vercel gravando o token num cofre) fica para depois: hoje a variável é trocada à mão.
- **Atendimento:** confirmar o horário da vendedora (`EMPRESA.horarioAtendimento`, `[CONFIRMAR]`).
- **Políticas e ajuda:** as páginas da loja ficam em `/politicas/*` e `/ajuda/*` (conteúdo da ajuda e busca em `src/loja/lib/ajuda/conteudo.ts`). Os pontos a validar com o ateliê e o jurídico estão marcados com `[CONFIRMAR]` nos comentários dessas páginas.
- **Referências antigas:** os comentários que citam guias como `seo.md §3.5` ou `referencia.md` se referem à documentação da loja original. Eles ficam como contexto e não existem neste repositório.
