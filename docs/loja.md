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

## Variáveis de ambiente (ver `.env.example`)

| Variável | Uso |
|---|---|
| `LOJA_HOSTS` | Hosts extras que abrem a loja (ex.: prévia da Vercel) |
| `INDEXNOW_CHAVE` | Opcional. Chave do IndexNow servida em `/<chave>.txt` |

## Testes

```bash
npm run test:loja
```

Os testes ficam em `tests/loja/` e cobrem o motor de URLs, o carrinho, o checkout, os pedidos, o rastreamento, a localização, os projetos, a calculadora de enxoval e a separação de hosts.

## Pendências

- **Conteúdo provisório:** produtos, preços, projetos de quartinho e pedidos são fictícios, e não há fotos. Cada página mostra um placeholder no lugar da foto. As fotos entram em `public/vitrine/produtos/<slug>/` e `public/vitrine/projetos/<slug>/`.
- **Projetos:** a área `/projetos` é a antiga "Loja de Casas" da base original. O código ainda fica em `src/loja/{componentes,lib}/casas` para manter os imports estáveis.
- **Catálogo:** ligar ao catálogo do ERP (`erp_core.records`, recurso `catalogo`) e criar pedidos e clientes da loja no ERP.
- **Checkout:** os pagamentos são simulados, falta integrar um gateway. A conta do cliente usa pedidos simulados no navegador.
- **WhatsApp no ERP:** o WhatsApp de vendas, (85) 98582-2208, vem do Instagram e já está em `src/loja/lib/empresa.ts`. Falta preencher `LEGAL_WHATSAPP_PHONE` no ERP com o mesmo número.
- **Políticas:** as políticas próprias da loja (privacidade, trocas e devoluções, cookies) ainda faltam, porque as de hoje são do ERP.
- **Referências antigas:** os comentários que citam guias como `seo.md §3.5` ou `referencia.md` se referem à documentação da loja original. Eles ficam como contexto e não existem neste repositório.
