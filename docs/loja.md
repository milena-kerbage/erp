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
- **Formas:** controles com cantos de 8 px e superfícies com 12–16 px, como nos mixins do ERP.
- **Regra:** `strictTokens: true`, então valor fora da escala vira erro de tipo. Nunca use cor, fonte ou medida literal num componente.

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

## Variáveis de ambiente (ver `.env.example`)

| Variável | Uso |
|---|---|
| `LOJA_HOSTS` | Hosts extras que abrem a loja (ex.: prévia da Vercel) |
| `INDEXNOW_CHAVE` | Opcional. Chave do IndexNow servida em `/<chave>.txt` |
| `AVALIACOES_GRAVAR_EM_DESENVOLVIMENTO` | Opcional. `true` libera gravar avaliações com `npm run dev` ligado a um banco remoto (padrão: simula) |

## Testes

```bash
npm run test:loja
```

Os testes ficam em `tests/loja/` e cobrem o motor de URLs, o carrinho (com projetos e o quartinho personalizado), o checkout, os pedidos, o rastreamento, a localização, os projetos, o montador "Monte o seu quartinho", a calculadora de enxoval e a separação de hosts.

## Pendências

- **Conteúdo provisório:** produtos, preços, projetos de quartinho e pedidos são fictícios, e não há fotos. Cada página mostra um placeholder no lugar da foto. As fotos entram em `public/vitrine/produtos/<slug>/` e `public/vitrine/projetos/<slug>/`.
- **Projetos:** a área `/projetos` é a antiga "Loja de Casas" da base original. O código ainda fica em `src/loja/{componentes,lib}/casas` para manter os imports estáveis. A página do projeto segue a página de produto, e o projeto vai para a MESMA sacola dos produtos (`tipo: "projeto"` no item, com pacote e opcionais). O "Monte o seu quartinho" (`/projetos/monte-o-seu`, regras em `src/loja/lib/casas/modulos.ts`) gera o item `tipo: "personalizado"`. A antiga seleção (`/projetos/selecao`) responde 308 para `/carrinho`, e o `mk_projetos` é migrado para a sacola na primeira visita. Falta o link "Monte o seu quartinho" nos destaques do painel "Projetos" do mega menu (`layout/cabecalho/menu.ts`).
- **Catálogo:** ligar ao catálogo do ERP (`erp_core.records`, recurso `catalogo`) e criar pedidos e clientes da loja no ERP.
- **Conta:** não há login. "Minha conta" (`/conta`) mostra os favoritos e os pedidos enviados pelo WhatsApp **neste aparelho** (localStorage `mk_pedidos_enviados`, gravado pelo checkout ao enviar; regras em `src/loja/lib/pedidos/historico.ts`). `/conta/entrar`, `/conta/cadastro` e `/conta/clube` redirecionam (308) para `/conta`.
- **WhatsApp no ERP:** o WhatsApp de vendas, (85) 98582-2208, vem do Instagram e já está em `src/loja/lib/empresa.ts`. Falta preencher `LEGAL_WHATSAPP_PHONE` no ERP com o mesmo número.
- **Políticas e ajuda:** as páginas da loja ficam em `/politicas/*` e `/ajuda/*` (conteúdo da ajuda e busca em `src/loja/lib/ajuda/conteudo.ts`). Os pontos a validar com o ateliê e o jurídico estão marcados com `[CONFIRMAR]` nos comentários dessas páginas.
- **Referências antigas:** os comentários que citam guias como `seo.md §3.5` ou `referencia.md` se referem à documentação da loja original. Eles ficam como contexto e não existem neste repositório.
