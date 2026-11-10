# Loja (e-commerce) do Ateliê Milena Kerbage

Loja de **enxoval e quarto de bebê** (kit berço, paninhos, quarto, maternidade e quartinhos personalizados), com peças a pronta entrega e sob encomenda feitas no ateliê em Fortaleza/CE e entrega para todo o Brasil (perfil oficial: [@milenakerbageatelie](https://www.instagram.com/milenakerbageatelie/)).

A loja e o ERP rodam no **mesmo projeto Next.js e no mesmo deploy da Vercel**, separados pelo domínio:

| Host | Abre | Observações |
|---|---|---|
| `ateliemilenakerbage.com.br` e `www.ateliemilenakerbage.com.br` | Loja | Pública e indexável. Origem canônica: `https://www.ateliemilenakerbage.com.br` |
| `app.ateliemilenakerbage.com.br` | ERP | Login obrigatório, `noindex`. `AUTH_ORIGIN` e `PUBLIC_BASE_URL` apontam para cá |
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

## Contas de cliente e cupom de primeira compra

Todo pedido é feito **com conta** (e-mail e senha). O cadastro é rápido e acontece no próprio passo do pedido (`/checkout`): nome, WhatsApp, e-mail, senha e o aceite dos Termos e da Privacidade (data e versão gravadas). CPF, endereço, data prevista ou de nascimento e nome do bebê, como conheceu o ateliê e preferências são **opcionais**, em Minha conta › Dados pessoais. O modelo de venda não muda: catálogo com preço "a partir de", pedido fechado pela vendedora no WhatsApp, sem pagamento nem frete no site; o "5% OFF no Pix" segue à parte.

As contas de cliente são **separadas das contas da equipe** do ERP: tabelas próprias (`erp_core.loja_*`, migração `009_loja_clientes.sql`), cookie próprio (`__Host-mk_cliente` em produção, `mk_cliente` em desenvolvimento: httpOnly, Secure em produção, SameSite=Lax, sem `Domain`, então só vale no host exato da loja e nunca chega ao `erp.`) e sessão conferida em outra tabela. O token da equipe não autentica na loja e vice-versa (teste em `tests/contas.test.mjs`).

| Peça | Arquivo |
|---|---|
| Regras puras (cadastro, senha, perfil, cupom, situações do pedido) | `src/loja/lib/contas/regras.ts` |
| Servidor (contas, sessões, redefinição, cupom, pedidos, ERP) | `src/lib/loja/contas.ts` |
| Avatar ilustrado (DiceBear "Gaze", CC0, gerado no servidor) | `src/lib/loja/avatar.ts` |
| E-mail de redefinição (preparado, **desligado**) | `src/lib/loja/emailContas.ts` |
| Cookie, origem, limites, trava de desenvolvimento, erros | `src/loja/lib/contas/servidor.ts` |
| APIs da loja | `src/app/(site)/loja/api/conta/*` e `src/app/(site)/loja/api/pedidos/route.ts` |
| Estado no navegador, formulários, menu, Minha conta | `src/loja/componentes/conta/*` e `src/loja/componentes/layout/Dropdown.tsx` |
| Pedido (passo da conta + envio) | `src/loja/componentes/checkout/PaginaPedido.tsx` |
| ERP: Clientes › Loja online e Pedidos › Da loja online | `src/features/store/components/*`, `/api/erp/loja/*` |

**APIs (host da loja):** `POST /api/conta/cadastrar` (cria conta, sessão e cupom), `POST /api/conta/entrar`, `POST /api/conta/sair`, `GET /api/conta/eu`, `PATCH /api/conta/perfil` (com `revisao`), `POST /api/conta/senha`, `POST /api/conta/redefinir` (token do link), `POST /api/conta/excluir` (`{senha, confirmacao:"EXCLUIR"}`), `GET /api/conta/pedidos`, `GET /api/conta/pedidos/<número>` e `POST /api/pedidos`. Erros: `{erro:{codigo,mensagem,campos?}}`; respostas `no-store`.

**Segurança:** escrita só da própria origem (Origin igual ao host da loja, https em produção, `Sec-Fetch-Site` cross-site recusado), corpo JSON com teto (4 KiB; 64 KiB no pedido), hash scrypt e comparação em tempo constante do ERP (`scryptHash`/`verifyPassword` de `src/lib/auth/core.ts`), mesma resposta e mesmo custo para e-mail inexistente e senha errada, tokens de 256 bits guardados só como SHA-256, sessão de 30 dias (14 de inatividade, renovação no máximo 1×/hora, até 10 aparelhos), revogação no "Sair", na troca e na redefinição de senha. Limites persistentes (mesmo limitador do login da equipe, chaves `loja-conta:*`, IP só como HMAC): login 5 por e-mail e 30 por conexão a cada 15 min (300 no total); cadastro 10 por conexão por hora (300 no total); redefinição 5 por token e 10 por conexão; troca de senha 5 por conta; pedidos 10 por conta e 30 por conexão por hora. Senha da cliente: 8 a 128 caracteres, letras e números, fora das mais comuns e sem o e-mail.

**Pedido no servidor:** o navegador manda só os itens da sacola (produto, opção, quantidade; projeto/quartinho como na sacola), o cupom escolhido, cidade/CEP, retirada e observações. O servidor recalcula os valores pelo catálogo (`catalogoParaCarrinho` e `linhas.ts`), recusa item indisponível (409) ou sem a opção obrigatória (400), confere o cupom e grava o pedido com número `MK-aammdd-XXXX`, a mensagem do WhatsApp (com número, itens "a partir de", cupom e os dados da cliente) e a situação inicial "Enviado pelo WhatsApp". A loja abre a aba do WhatsApp dentro do clique (para o bloqueador de pop-up deixar) e a leva ao `wa.me` quando o servidor responde; o histórico deste aparelho (`mk_pedidos_enviados`) continua como cache, mas a fonte é o servidor. Situações: Enviado pelo WhatsApp → Pagamento confirmado → Despachado para a transportadora → Entregue (ou Cancelado), escolhidas pela equipe no ERP; Minha conta mostra as 3 etapas de entrega como linha do tempo. Se as contas estiverem fora do ar (503), a tela de pedido oferece mandar a sacola direto pelo WhatsApp, sem registro nem cupom.

**Cupom de primeira compra:** ao criar a conta, a cliente ganha `BEMVINDA-XXXX` (5%, uso único, ligado à conta). Logada, ele entra sozinho na sacola (dá para tirar; fica guardado). É conferido e consumido **só no servidor**, na mesma transação do pedido (bloqueio da linha no PostgreSQL; dois pedidos simultâneos: só um leva). Um cupom por pedido: `ENXOVAL10` entra no lugar do de primeira compra (aviso na sacola) e `BEMVINDO5`, com conta, vira o cupom da própria conta. Divulgação: faixa na sacola (deslogada), cartão no passo da conta do pedido, Minha conta (deslogada: convite; logada: cupom disponível ou usado) e o item "Criar conta (ganhe 5% OFF)" no menu da conta do cabeçalho.

**Esqueci a senha (sem SMTP):** a tela de login orienta a pedir um link pelo WhatsApp. No ERP (Clientes › Loja online › cliente), admin ou gestão clica em "Gerar link de redefinição de senha": o link `https://www.ateliemilenakerbage.com.br/conta/redefinir#<token>` aparece **uma vez** para copiar ou abrir a conversa com a mensagem pronta; vale 2 horas, funciona uma vez, gerar outro invalida o anterior e a troca de senha também. O token fica no fragmento (não vai a servidor, log nem Referer) e a página o tira da barra. Para enviar também por e-mail quando houver SMTP: configure `SMTP_*` e `LOJA_EMAIL_REDEFINICAO=true` (o envio sai depois da resposta, com `after()`).

**LGPD:** só o mínimo no cadastro; os opcionais podem ser apagados (campo vazio). "Excluir minha conta" (Minha conta › Segurança, com senha e confirmação) apaga a conta, as sessões, os links e o cupom e **anonimiza** os pedidos (sem nome, contato, cidade, observações nem mensagem; ficam peças e valores). As políticas (`/politicas/privacidade#conta`, `/politicas/termos#conta` e `/politicas/cookies`) descrevem a conta, os dados, o cupom e o cookie de sessão.

**Desenvolvimento seguro:** com `npm run dev` ligado a um `DATABASE_URL` remoto (que pode ser o de produção), todas as rotas de **escrita** das contas e do pedido respondem 503 `GRAVACAO_DESLIGADA` (a tela avisa). Para gravar de propósito nesse cenário: `CONTAS_GRAVAR_EM_DESENVOLVIMENTO=true`. Para testar o fluxo completo sem tocar no Supabase: `npm run build` e `DATABASE_URL= ALLOW_LOCAL_SQLITE=true ERP_DB_PATH=/tmp/erp.sqlite AUTH_DB_PATH=/tmp/auth.sqlite npx next start -p 3120`, com a loja em `http://www.localhost:3120`.

**Produção:** a migração `009_loja_clientes.sql` precisa ser aplicada no Supabase (`npm run db:migrate -- --confirm=APLICAR-MIGRACOES --allow-existing` e `npm run db:check`, com autorização do responsável). Antes disso, `/api/conta/eu` responde 503 e a tela de pedido cai no envio direto pelo WhatsApp (sem conta nem cupom).

Testes: `npm run test:contas` (SQLite) e `npm run test:contas:postgres` (PGlite com as migrações 001, 006, 009 e 010).

## Gestão do e-commerce no ERP

Base do módulo "E-commerce" do ERP (telas em `src/features/ecommerce/`: vendas em `vendas/` — visão geral, pedidos, cupons, clientes, carrinhos — e o catálogo em `catalogo/`; avaliações em `src/features/reviews/`, na rota `/ecommerce/avaliacoes`): o catálogo, o menu do cabeçalho, os cupons de campanha, os carrinhos abandonados e o painel passam a ser cadastrados no banco e editados pelo ERP. As regras de venda não mudam: catálogo com preço "a partir de", pedido sempre pelo WhatsApp (sem pagamento online), frete a consultar, "5% OFF no Pix", conta obrigatória no pedido e o cupom de 5% da primeira compra.

### Banco (migração `010_loja_gestao.sql`, 15 tabelas em `erp_core`)

| Tabela | Conteúdo |
|---|---|
| `loja_categorias` | Árvore (pai, slug, `caminho` = URL e chave do motor de URLs, nome, descrição, imagem, ordem, ativa, SEO) |
| `loja_produtos` | Slug, SKU, nome, marca, resumo, descrição em parágrafos (JSON), preço e preço "de" em centavos, unidade, selo, peças do kit, personalização, ficha agrupada (JSON), atributos/facetas (JSON), disponibilidade (pronta entrega / sob encomenda), prazo, status (rascunho/ativo/arquivado), destaque, categoria principal, linha de cores + cor (a mesma peça em outras cores), ordem, SEO, revisão |
| `loja_produto_categorias` | Categorias extras (o produto aparece também nessas listagens) |
| `loja_produto_relacionados` | "Complete o enxoval" (complemento) e "Você também poderá gostar" (semelhante), em ordem; sem semelhantes cadastrados, a loja calcula pela categoria |
| `loja_produto_imagens` | Fotos em BYTEA, recomprimidas com sharp (WebP, lado maior 1600 px, miniatura 400 px, sem metadados; até 3 MiB e 12 por produto), alt, tipo, cor, posição e hash (ETag) |
| `loja_grupos_opcoes`, `loja_opcoes`, `loja_produto_grupos` | Grupos reaproveitáveis: `escolha` (o seletor obrigatório, ex.: "Tamanho do berço") e `personalizacao` (o "com/sem bordado", com o acréscimo da sua opção). Cada opção: rótulo, acréscimo em centavos, disponível, ordem |
| `loja_colecoes`, `loja_colecao_produtos` | Coleções com slug, onde aparecem (home/listagem/ambos), ordem e produtos em ordem. A home usa `mais-vendidos` e, se existir, `pronta-entrega` |
| `loja_menu_itens` | Menu do cabeçalho como árvore: `item` (1º nível, painel `colunas` ou `cards`) → `destaque`, `secundario`, `coluna` (→ `link`), `card` (tom, ícone, imagem) e `promo` (bloco editorial) |
| `loja_cupons_campanha`, `loja_cupom_usos` | Cupons de campanha (percentual 1–50% ou valor fixo, mínimo, validade, limite total e por cliente, só primeira compra, exibir na sacola, ativo) e cada uso (pedido, cliente, desconto) |
| `loja_carrinhos` | Carrinho sincronizado da cliente **logada** (itens com o retrato de nome e preço, total, criado/atualizado, convertido em pedido, lembrete) |
| `loja_cliente_leads` | Conta da loja → lead do CRM (`erp_core.leads`) |

Todas com RLS, sem concessões a `anon`/`authenticated`, CHECKs de tamanho/enum e revisão otimista. O espelho SQLite (desenvolvimento e testes) fica em `src/lib/loja/gestao/esquema.ts`.

### Como a loja lê o catálogo

- `src/lib/loja/gestao/catalogoBanco.ts` lê os produtos **ativos**, as categorias ativas, coleções, menu e cupons numa transação só e converte para as **mesmas estruturas** do catálogo de exemplo (`Produto`, `ItemMenu`, `Cupom`): a loja não muda de cara (o teste confere campo a campo que o banco importado é idêntico ao exemplo).
- `src/lib/loja/catalogo.ts` (só servidor) guarda esse retrato com `unstable_cache` por 1 h e as tags `loja:catalogo`, `loja:menu` e `loja:cupons`; cada escrita do ERP chama `revalidateTag(tag, {expire: 0})` (a próxima visita já vê a mudança). Helpers: `catalogoDaLoja()`, `indiceDaLoja()` (buscarProduto, buscarVarios, listarSlugs, coleções), `arvoreDaLoja()` (categorias, facetas, relacionadas), `menuDaLoja()` e `catalogoDaSacola()`.
- **Fallback:** sem produto ativo no banco, sem a migração 010 ou com o banco fora do ar, a loja usa o catálogo estático de sempre (`src/loja/lib/catalogo/*`, `menu.ts`); o erro não entra no cache. Sem cupons cadastrados, valem os de código (`CUPONS`).
- Usam a camada: página de produto, listagens (categoria, pronta entrega, edição do mês, busca e sugestões), home, menu do cabeçalho, sitemap, sacola, checkout, Minha conta, montador, avaliações e o recálculo de `POST /api/pedidos`. Os componentes cliente recebem o catálogo e os cupons por props do servidor. O proxy (redirecionamento canônico de listagem) continua com a árvore estática: categoria raiz nova criada no ERP abre normalmente, mas sem o 308 de forma canônica no proxy (a própria página redireciona).
- **Acréscimos:** `resolverItem` (`src/loja/lib/carrinho/linhas.ts`) soma ao preço da linha o acréscimo da opção escolhida e o do bordado ("com"); vale na sacola, no pedido e no recálculo do servidor. Trocar o rótulo de uma opção invalida a linha nas sacolas que já a tinham (a sacola pede para editar).
- **Fotos:** `GET /api/catalogo/imagem/:id?v=<hash>[&tamanho=mini]` (host da loja), só de produto ativo, `Cache-Control: immutable` e ETag (304). Vão direto ao navegador (`unoptimized`, já são WebP otimizados). Imagens de categoria e de menu: só arquivos da loja (`/vitrine/…`).

### Carrinho sincronizado e carrinhos abandonados

Com a cliente logada, `SincronizarCarrinho` (no layout da loja) manda a sacola a `PUT /api/carrinho/sincronizar` com debounce de 2 s; sem login nada sai do aparelho. O servidor valida os itens, recalcula o total "a partir de", não regrava se nada mudou e marca o carrinho como convertido ao criar o pedido (itens novos depois abrem outro carrinho). Abandonado = com itens, não convertido e parado há X horas (`?horas=`, padrão 24). O ERP só **monta** a mensagem e o link `wa.me` (a vendedora envia); `lembrete_em` registra quando. A política de privacidade (`#conta`) e a de cookies avisam; excluir a conta apaga o carrinho.

### Lead no CRM

No cadastro da conta, a loja liga a cliente a um lead existente com o mesmo e-mail ou WhatsApp ou cria um no funil Vendas, etapa "Novo lead", origem e etiqueta "Loja online". A cada pedido, o lead ganha uma nota com número, peças, valor e cupom. Tudo em segundo plano: falhar no CRM nunca impede o cadastro nem o pedido (o vínculo é refeito no pedido). A exclusão da conta não apaga o lead (a política explica como pedir).

### APIs do ERP (`/api/erp/loja/**`)

Sessão da equipe (sem chave de API). **Leitura** do catálogo (categorias, produtos, opções, coleções, menu): admin, gestão e membro. **Escrita** e dados de clientes (cupons e usos, carrinhos, painel, clientes, pedidos): admin e gestão; escrita só com origem confiável e limite de 60/min. Toda escrita grava em `erp_audit` (aparece nas notificações) e invalida o cache da loja. Corpo JSON até 256 KiB; campos desconhecidos → 400 `UNKNOWN_FIELD`; `revisao` desatualizada → 409 `REVISION_CONFLICT`; `npm run dev` com banco remoto → 503 `GRAVACAO_DESLIGADA` (libere com `LOJA_GRAVAR_EM_DESENVOLVIMENTO=true`). Erros: `{error, code}`. Tipos do contrato: `src/lib/loja/gestao/tipos.ts` (reexportados em `src/features/ecommerce/types.ts`).

| Rota | Métodos e corpo | Resposta |
|---|---|---|
| `categorias` | `GET`; `POST EntradaCategoria` | `RespostaCategorias` (lista + árvore); `{categoria}` |
| `categorias/:id` | `GET`; `PATCH {revisao,…}` (slug/mãe novos atualizam o caminho das filhas); `DELETE ?revisao=` (sem filhas nem produtos) | `{categoria}`; `{removida}` |
| `categorias/ordem` | `PUT {paiId, ids}` | `RespostaCategorias` |
| `produtos` | `GET ?status&categoria&disponibilidade&busca&limit&offset`; `POST EntradaProduto` (nasce rascunho) | `RespostaProdutos`; `{produto}` |
| `produtos/:id` | `GET`; `PATCH {revisao,…}`; `DELETE ?revisao=` (só rascunho/arquivado) | `{produto: ProdutoGestao}`; `{removido}` |
| `produtos/:id/duplicar` | `POST {slug?, sku?, nome?}` (cópia em rascunho, com fotos e opções) | `{produto}` |
| `produtos/:id/arquivar` | `POST {revisao}` | `{produto}` |
| `produtos/:id/imagens` | `GET`; `POST multipart` (`arquivo`, `revisao`, `alt?`, `cor?`, `tipo?`) | `{imagens}` |
| `produtos/:id/imagens/ordem` | `PUT {revisao, ids}` | `{imagens}` |
| `produtos/:id/imagens/:imagemId` | `GET ?tamanho=mini\|grande` (prévia); `PATCH {revisao, alt?, cor?, tipo?}`; `DELETE ?revisao=` | binário; `{imagens}` |
| `opcoes` | `GET`; `POST EntradaGrupoOpcoes` | `{grupos}`; `{grupo}` |
| `opcoes/:id` | `GET`; `PATCH {revisao,…, opcoes?}` (substitui a lista); `DELETE ?revisao=` (fora de produtos) | `{grupo}`; `{removido}` |
| `colecoes` | `GET`; `POST EntradaColecao` | `{colecoes}`; `{colecao}` |
| `colecoes/:id` | `GET`; `PATCH {revisao,…, produtos?}` (a lista na nova ordem); `DELETE ?revisao=` | `{colecao}`; `{removida}` |
| `menu` | `GET`; `POST EntradaItemMenu` | `RespostaMenu` (árvore, tons, ícones); `{item}` |
| `menu/:id` | `PATCH {revisao,…}`; `DELETE ?revisao=` (com o que está dentro) | `{item}`; `{removido}` |
| `menu/ordem` | `PUT {paiId, ids}` | `RespostaMenu` |
| `cupons` | `GET ?busca`; `POST EntradaCupom` | `RespostaCupons` (`{cupons, primeiraCompra}`: o resumo só leitura do cupom de 1ª compra); `{cupom}` |
| `cupons/:id` | `GET`; `PATCH {revisao,…}` (ativar/desativar com `ativo`) | `{cupom}` |
| `cupons/:id/usos` | `GET ?limit&offset` | `RespostaUsosCupom` |
| `carrinhos` | `GET ?horas=24&busca&minimoCentavos&lembrete=todos\|sem\|com&limit&offset` | `RespostaCarrinhos` |
| `carrinhos/:clienteId/mensagem` | `POST` (só monta o link; nada é enviado) | `RespostaMensagemCarrinho` |
| `painel` | `GET ?periodo=7d\|30d\|90d&horas=24` | `PainelLoja` |
| `clientes`, `clientes/:id` | (existentes) agora com `lead: LeadVinculado`; a lista traz `ultimoPedidoEm` e o detalhe, `carrinho` (`CarrinhoDaCliente`, a sacola aberta) | |
| `pedidos` | (existente) `GET ?status&busca&desde=AAAA-MM-DD&ate=AAAA-MM-DD&limit&offset`; a contagem por situação segue a busca e o período; cada pedido traz `atualizadoEm` | |

Os cupons `BEMVINDO5` e `BEMVINDA-…` são reservados (o de primeira compra continua por conta). Cupom já usado não troca de código; o esgotado sai da sacola.

### Importar o catálogo de exemplo

`npm run loja:importar-catalogo` (`src/lib/loja/gestao/semente.ts`) insere categorias, grupos de opções, produtos, a coleção "Mais vendidos", o menu e o `ENXOVAL10` **só onde falta** (idempotente: nunca sobrescreve edição feita no ERP; o menu só entra com a tabela vazia). Com `DATABASE_URL` definido (em `.env.local` é PRODUÇÃO) exige `--confirm=IMPORTAR-CATALOGO`. Local: `DATABASE_URL= ALLOW_LOCAL_SQLITE=true ERP_DB_PATH=/tmp/erp.sqlite npm run loja:importar-catalogo`.

**Produção (com autorização do responsável), nesta ordem:**

```bash
npm run db:check
npm run db:migrate -- --confirm=APLICAR-MIGRACOES --allow-existing
npm run loja:importar-catalogo -- --confirm=IMPORTAR-CATALOGO
npm run db:check
```

Antes da migração, a loja segue no catálogo estático e os pedidos funcionam (sem registrar uso de cupom de campanha, carrinho nem lead).

Testes: `npm run test:loja-gestao` (SQLite) e `npm run test:loja-gestao:postgres` (PGlite com 001, 006, 009 e 010).

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

### Conexão pelo ERP (OAuth)

A integração em `/configuracoes/instagram` conecta o perfil pelo login oficial e guarda o token criptografado no banco. Configuração, callbacks, migração `015_instagram.sql` e testes estão em [Instagram e Meta](instagram-meta.md). Com `INSTAGRAM_APP_ID` preenchido, o feed usa exclusivamente essa conexão; não recorre ao token manual após desconexão ou revogação. Para esse fluxo, use `npm run instagram:manutencao` e a renovação pela tela.

### Como obter o token manual (alternativa sem OAuth)

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
- **"Entrar" e "Cadastre-se" antigos** (sem conta real): voltaram como páginas reais com as contas de cliente (`/conta/entrar` e `/conta/cadastro`, veja "Contas de cliente"). `/conta/clube` segue respondendo 308 para `/conta`.
- "Acompanhe seu pedido" virou **"Pedidos enviados"** (`LINKS_UTILITARIOS.pedido`), que é o que `/conta/pedidos` mostra.

## Rodapé

Três faixas sobre o fundo escuro, separadas por pesponto: (1) destaques — "Indique o ateliê" com botão para `/indique`, o atendimento (botão do WhatsApp, e-mail, horário e cidade) e "Feito à mão em Fortaleza · Entrega para todo o Brasil" com as formas de pagamento só como informação ("5% OFF no Pix · até 10x no cartão · combinado pelo WhatsApp"); (2) o menu em 6 colunas (Comprar, Ajuda, Minha conta, O ateliê, Políticas e Redes sociais), acordeões no celular; (3) a linha legal com "Voltar ao topo". Não há newsletter (a loja não envia e-mails) nem selos de segurança. O horário de atendimento está em `EMPRESA.horarioAtendimento` (`src/loja/lib/empresa.ts`), marcado com `[CONFIRMAR]`.

## Personalizado (quartinhos)

A área de quartinhos completos se chama **Personalizado** (era "Projetos", e antes a "Loja de Casas" da base original). O código continua em `src/loja/{componentes,lib}/casas` para manter os imports estáveis.

| | |
|---|---|
| Listagem | `/personalizado` (filtros por tema, estilo e tecido pelo motor de URLs) |
| Quartinho do ateliê | `/personalizado/<slug>` (ex.: "Quartinho Jardim de Camomila"), no padrão da página de produto; vai para a sacola como `tipo: "projeto"` (pacote e opcionais) |
| Seleções e conteúdos | `/personalizado/{menina,menino,neutro,floral,safari,nuvens,classico}`, `/personalizado/como-funciona`, `/personalizado/orcamento` |
| Montador | `/personalizado/monte-o-seu` (307 para a 1ª etapa) e `/personalizado/monte-o-seu/{tema,berco,quarto,banho-e-maternidade,bordado,resumo}`; gera o item `tipo: "personalizado"` ("Meu quartinho personalizado · <paleta>") |

**Redirecionamentos (308):** toda URL antiga `/projetos/**` vai para `/personalizado/**` com a busca preservada, e `/projetos/selecao` vai para `/carrinho` (`src/loja/lib/seo/legado.ts`, aplicado no proxy da loja, então o ERP não é afetado). O `mk_projetos` da seleção antiga ainda é migrado para a sacola na primeira visita.

**Montador "Monte o seu quartinho"** (`componentes/casas/Montador.tsx`, regras em `lib/casas/modulos.ts` e `lib/casas/etapas.ts`):
- Uma página por etapa; o estado fica no layout da rota (`monte-o-seu/layout.tsx`), que não remonta entre as etapas (a `TransicaoPagina` trata as etapas como uma página só; a troca de etapa tem animação própria, rolagem ao topo e foco no título).
- Progresso no topo (visitados clicáveis, atual em destaque, check nos concluídos), "Voltar"/"Continuar" (fixos no rodapé no celular) e validação por etapa: tema e paleta; tamanho do berço quando há peça de berço; pelo menos uma peça ao sair de "Banho e maternidade"; nome do bordado quando ligado. Quem chega por URL a uma etapa adiante com pendência volta para ela.
- Rascunho em `localStorage` (`mk_montador`: quartinho, bordado e etapas visitadas). `?projeto=<slug>` começa de um quartinho do ateliê; `?editar=<id>` edita o quartinho da sacola (a sacola leva ao resumo).
- Resumo lateral: prévia ilustrada do quarto nas cores da paleta (peças entram e saem com animação, a recém-incluída ganha um halo e há um leve parallax com o mouse), miniaturas em carrossel contínuo (pausa no hover e no foco; com movimento reduzido, rolagem com snap) que abrem o visualizador em tela cheia da PDP (`produto/Visualizador.tsx`, agora com `desenhar` e `legendas`).
- "Ver peças parecidas" abre um modal (base `Modal`) com as peças do catálogo da mesma categoria do módulo (`componentes/casas/dadosMontador.ts`); "Usar esta peça no meu quartinho" troca as opções do módulo pela peça (o módulo passa a valer o "a partir de" dela; nome e preço são conferidos de novo contra o catálogo ao abrir o montador).

**Página do quartinho:** a seção de perguntas saiu; o "Passo a passo" virou uma linha do tempo (marcos numerados, ícone, título, texto e prazo; horizontal no desktop, trilho com snap no celular) com a linha preenchida conforme a rolagem (`animation-timeline: view()`; sem suporte ou com movimento reduzido, já aparece preenchida). Os prazos de "Pedido" e "Confirmação" estão marcados com `[CONFIRMAR]` em `lib/casas/catalogo.ts`.

## Variáveis de ambiente (ver `.env.example`)

| Variável | Uso |
|---|---|
| `LOJA_HOSTS` | Hosts extras que abrem a loja (ex.: prévia da Vercel) |
| `INDEXNOW_CHAVE` | Opcional. Chave do IndexNow servida em `/<chave>.txt` |
| `CONTAS_GRAVAR_EM_DESENVOLVIMENTO` | Opcional. `true` libera as escritas das contas e dos pedidos com `npm run dev` ligado a um banco remoto (padrão: recusa com 503) |
| `LOJA_GRAVAR_EM_DESENVOLVIMENTO` | Opcional. O mesmo para a gestão do e-commerce no ERP e o carrinho sincronizado (também aceita `CONTAS_GRAVAR_EM_DESENVOLVIMENTO`) |
| `LOJA_ORIGEM` | Opcional. Origem da loja nos links de redefinição gerados no ERP (padrão: `https://www.ateliemilenakerbage.com.br`) |
| `LOJA_EMAIL_REDEFINICAO` | Opcional, desligada. `true` (com `SMTP_*`) também envia por e-mail o link de redefinição gerado no ERP |
| `AVALIACOES_GRAVAR_EM_DESENVOLVIMENTO` | Opcional. `true` libera gravar avaliações com `npm run dev` ligado a um banco remoto (padrão: simula) |
| `INSTAGRAM_ACCESS_TOKEN` | Opcional e **secreta** (só servidor). Token de longa duração da conta @milenakerbageatelie para a seção de Instagram da home. Vazia: a seção mostra o convite para seguir |
| `INSTAGRAM_GRAPH_VERSION` | Opcional. Versão da API do Instagram (padrão `v27.0`) |

## Testes

```bash
npm run test:loja
```

Os testes ficam em `tests/loja/` e cobrem o motor de URLs, o carrinho (com os quartinhos do ateliê e o quartinho personalizado), o checkout, os pedidos, o rastreamento, a localização, a área Personalizado (`casas.test.mjs`), o montador "Monte o seu quartinho" e as etapas (`montador.test.mjs`), os redirecionamentos das URLs antigas (`legado.test.mjs`), a normalização e o fallback do feed do Instagram (`instagram.test.mjs`) e a separação de hosts.

## Pendências

- **Conteúdo provisório:** produtos, preços, quartinhos do ateliê e pedidos são fictícios, e não há fotos. Cada página mostra um placeholder no lugar da foto. As fotos entram em `public/vitrine/produtos/<slug>/` e `public/vitrine/projetos/<slug>/`.
- **Personalizado:** ver a seção "Personalizado (quartinhos)" acima.
- **Catálogo:** a base da gestão está pronta (seção "Gestão do e-commerce no ERP"); faltam as telas do ERP, aplicar a 010 + importação em produção, decidir a indexação das páginas de produto (seguem `noindex`), mostrar o preço "de" e o acréscimo das opções na página de produto e uma página por coleção.
- **Contas:** aplicar a migração `009_loja_clientes.sql` em produção (até lá, o pedido cai no envio direto pelo WhatsApp). O lead do CRM já é criado/ligado no cadastro e recebe uma nota por pedido; o envio do link de redefinição por e-mail (preparado) fica para depois. Quem exclui a conta e cria outra com o mesmo e-mail ganha um novo cupom de primeira compra (nada do e-mail antigo é guardado).
- **WhatsApp no ERP:** o WhatsApp de vendas, (85) 98582-2208, vem do Instagram e já está em `src/loja/lib/empresa.ts`. Falta preencher `LEGAL_WHATSAPP_PHONE` no ERP com o mesmo número.
- **Instagram:** gerar o token (passo a passo em "Instagram") e combinar quem renova a cada 60 dias. Uma renovação automática (cron da Vercel gravando o token num cofre) fica para depois: hoje a variável é trocada à mão.
- **Atendimento:** confirmar o horário da vendedora (`EMPRESA.horarioAtendimento`, `[CONFIRMAR]`).
- **Políticas e ajuda:** as páginas da loja ficam em `/politicas/*` e `/ajuda/*` (conteúdo da ajuda e busca em `src/loja/lib/ajuda/conteudo.ts`). Os pontos a validar com o ateliê e o jurídico estão marcados com `[CONFIRMAR]` nos comentários dessas páginas.
- **Referências antigas:** os comentários que citam guias como `seo.md §3.5` ou `referencia.md` se referem à documentação da loja original. Eles ficam como contexto e não existem neste repositório.
