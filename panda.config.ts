import { defineConfig } from "@pandacss/dev";
import { receitaBotao } from "./src/loja/estilos/receitas/botao";

// Panda CSS: estilos com API de objeto (css, styled, receitas) gerados NO BUILD.
// Zero JavaScript de estilo no navegador e funciona em Server Components (docs/loja.md).
// Identidade do Ateliê Milena Kerbage: a mesma do ERP (src/styles/theme.ts) — sálvia #788569 da
// logo, neutros quentes puxados para o verde, Inter no texto e Scarlett só em destaques sem acento
// (a fonte não tem acentos nem cedilha). Componentes nunca usam cor ou medida literal.
export default defineConfig({
  // Panda v2 não adiciona nada por padrão: preset-base = utilitários, condições e padrões
  // (Container, Grid, Stack…); preset-panda = escala de espaçamento (passo de 4 px) e tipografia.
  presets: ["@pandacss/preset-base", "@pandacss/preset-panda"],
  preflight: true,
  // Valor fora dos tokens vira erro de tipo (ex.: h="18" inexistente). Valor arbitrário só com [ ].
  strictTokens: true,
  // Só a loja: o ERP usa Emotion e não passa pelo Panda.
  include: ["./src/loja/**/*.{ts,tsx}", "./src/app/(site)/**/*.{ts,tsx}"],
  exclude: [],
  outdir: "styled-system",
  jsxFramework: "react",

  theme: {
    extend: {
      // Home e cabeçalho no modelo da shop.lululemon.com (lululemon-referencia.md §5.1): o cabeçalho
      // vira pílula flutuante a partir de 992 px e os itens do menu ganham respiro a partir de 1200 px.
      breakpoints: {
        desktop: "62rem", // 992 px
        largo: "75rem", // 1200 px
      },
      recipes: { botao: receitaBotao },
      keyframes: {
        // PDP, cards e features (lululemon-animacoes-edicao.md §1): parallax guiado pela rolagem
        // (a mídia é 30% mais alta que a moldura e anda ±15% da altura da moldura), brilho do
        // esqueleto (60% do ciclo) e entrada das seções abaixo da dobra.
        parallaxMidia: { from: { transform: "translateY(-11.5%)" }, to: { transform: "translateY(11.5%)" } },
        brilhoEsqueleto: { "0%": { transform: "translateX(-100%)" }, "60%, 100%": { transform: "translateX(100%)" } },
        subirSecao: { from: { opacity: "0", transform: "translateY(24px)" }, to: { opacity: "1", transform: "none" } },
        // Home e cabeçalho (lululemon-referencia.md §1.3, §1.5, §3.3)
        brilhoDestaque: { from: { backgroundPosition: "100% 0" }, to: { backgroundPosition: "0% 0" } },
        revelarLetra: { from: { opacity: "0", transform: "translateY(100%)" }, to: { opacity: "1", transform: "none" } },
        subirSuave: { from: { opacity: "0", transform: "translateY(30px) scale(0.95)" }, to: { opacity: "1", transform: "none" } },
        subirBotoes: { from: { transform: "translateY(125%)" }, to: { transform: "none" } },
        assentarSlide: { from: { transform: "scale(1.07)" }, to: { transform: "none" } },
        entrarColuna: { from: { opacity: "0", transform: "translateY(5px)" }, to: { opacity: "1", transform: "none" } },
        surgir: { from: { opacity: "0", transform: "translateY(-4px)" }, to: { opacity: "1", transform: "none" } },
        escurecer: { from: { opacity: "0" }, to: { opacity: "1" } },
        entrarDireita: { from: { transform: "translateX(100%)" }, to: { transform: "none" } },
        avancarNivel: { from: { opacity: "0", transform: "translateX(24px)" }, to: { opacity: "1", transform: "none" } },
        // Atalhos flutuantes: a doca sobe da base, as bolinhas "saltam" em sequência, o painel abre
        // e fecha com mola a partir da doca e o conteúdo entra em cascata.
        subirDoca: { from: { opacity: "0", transform: "translateY(24px) scale(0.92)" }, to: { opacity: "1", transform: "none" } },
        saltar: {
          "0%": { opacity: "0", transform: "translateY(10px) scale(0.6)" },
          "60%": { opacity: "1", transform: "translateY(-3px) scale(1.06)" },
          "100%": { opacity: "1", transform: "none" },
        },
        abrirPainel: { from: { opacity: "0", transform: "translateY(24px) scale(0.94)" }, to: { opacity: "1", transform: "none" } },
        fecharPainel: { from: { opacity: "1", transform: "none" }, to: { opacity: "0", transform: "translateY(16px) scale(0.96)" } },
        entrarItem: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "none" } },
        clarear: { from: { opacity: "1" }, to: { opacity: "0" } },
        // Montar por voz: ondas saindo do microfone enquanto ouve e brilho correndo enquanto pensa.
        onda: { from: { opacity: "0.45", transform: "scale(1)" }, to: { opacity: "0", transform: "scale(1.9)" } },
        brilho: { from: { backgroundPosition: "200% 0" }, to: { backgroundPosition: "-200% 0" } },
        piscar: { "0%, 100%": { opacity: "0.3" }, "50%": { opacity: "1" } },
        // Fundo cinematográfico (4 quadros de 5 s): cada foto aparece, aproxima e some.
        // Sacola (lululemon-sacola.md): folha que sobe da base no celular e esqueleto que pulsa.
        subirFolha: { from: { transform: "translateY(100%)" }, to: { transform: "none" } },
        pulsar: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.55" } },
        cinema: {
          "0%": { opacity: "1", transform: "scale(1.02)" },
          "25%": { opacity: "1" },
          "29%": { opacity: "0", transform: "scale(1.16)" },
          "96%": { opacity: "0", transform: "scale(1.02)" },
          "100%": { opacity: "1", transform: "scale(1.02)" },
        },
        // Edição do mês (lululemon-animacoes-edicao.md §1): parallax leve da mídia dos blocos
        // editoriais, ligado à rolagem (animation-timeline). A mídia é 16% mais alta que o bloco.
        parallaxBloco: { from: { transform: "translateY(-6%)" }, to: { transform: "translateY(6%)" } },
        // Transição de página da loja (TransicaoPagina): o conteúdo antigo some e o novo entra subindo
        // 8 px. Com movimento reduzido, só a opacidade.
        sairPagina: { from: { opacity: "1" }, to: { opacity: "0" } },
        entrarPagina: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "none" } },
        aparecerPagina: { from: { opacity: "0" }, to: { opacity: "1" } },
      },
      tokens: {
        // Escala de títulos da referência (lululemon-referencia.md §5.7) que não existe no preset.
        fontSizes: {
          subtitulo: { value: "1.75rem" }, // 28 px: subtítulo do hero, menu do celular, bloco no celular
          blocoTablet: { value: "2rem" }, // 32 px
          bloco: { value: "2.5rem" }, // 40 px: par editorial e cartão do WhatsApp
          heroCelular: { value: "3.125rem" }, // 50 px
          secaoTablet: { value: "3.5rem" }, // 56 px
          secao: { value: "4rem" }, // 64 px: título de seção e de feature
          destaque: { value: "1.375rem" }, // 22 px: destaques e "frase da linha" da página de produto no celular
        },
        lineHeights: {
          titulo: { value: "1.1" },
          bloco: { value: "1.2" },
          subtitulo: { value: "1.3" },
          texto: { value: "1.4" },
        },
        letterSpacings: {
          titulo: { value: "-0.04em" },
          bloco: { value: "-0.02em" },
        },
        blurs: {
          botao: { value: "20px" }, // botão claro sobre foto
        },
        fonts: {
          // Variáveis injetadas pelo next/font em src/app/(site)/layout.tsx (as mesmas do ERP).
          corpo: { value: "var(--font-inter), system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" },
          titulo: { value: "var(--font-inter), system-ui, -apple-system, sans-serif" },
          // Fonte da marca: só frases curtas SEM acento (ex.: "Cada detalhe, bem cuidado").
          marca: { value: "var(--font-scarlett), Georgia, serif" },
          mono: { value: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" },
        },
        radii: {
          // Mesma escala do ERP: controles com 8 px, superfícies com 12–16 px.
          sm: { value: "6px" },
          md: { value: "8px" },
          lg: { value: "12px" },
          cartao: { value: "12px" },
          campo: { value: "8px" },
          bloco: { value: "16px" }, // blocos grandes, como o cartão do rodapé
          pilula: { value: "1000px" }, // botões, controles, campo de busca e amostras de cor
          vidro: { value: "36px" }, // cartão de vidro da home (24 px no celular = 3xl)
        },
        sizes: {
          conteudo: { value: "1420px" }, // --container-max
          leitura: { value: "720px" },
          cabecalho: { value: "60px" }, // barra principal (Nike: 60 px)
          barraUtilitaria: { value: "36px" }, // faixa de links acima do cabeçalho, só no desktop
          campoBusca: { value: "176px" }, // busca recolhida no cabeçalho (Nike: 176×40)
          buscaAberta: { value: "778px" }, // campo do painel de busca (Nike: 778 px a 1440)
          colunaMenu: { value: "200px" }, // coluna do mega menu
          vitrine: { value: "1180px" }, // banner e cards de categoria da home (Mercado Livre: 1180 px)
          gaveta: { value: "min(320px, 75vw)" }, // menu lateral do celular
          // Cabeçalho em pílula e home (lululemon-referencia.md §1 e §3)
          faixaPromo: { value: "33px" },
          pilulaCabecalho: { value: "48px" },
          topoCabecalho: { value: "64px" }, // 16 de recuo + 48 da pílula: espaço reservado fora da home
          cabecalhoCelular: { value: "56px" },
          gavetaBusca: { value: "440px" },
          grade: { value: "1360px" }, // largura máxima do conteúdo contido da home
          megaMenu: { value: "60rem" }, // teto do painel do mega menu (960 px)
          // Atendimento e rodapé (lululemon-referencia.md §3.8 e §4)
          colunaRodape: { value: "210px" }, // 6 colunas de 210 com 20 de vão (1360 em 1440)
          qrAtendimento: { value: "140px" }, // QR code do cartão de vidro
          // Página de produto e listagem (lululemon-pdp.md §1, §3 e §6)
          painelCompra: { value: "440px" }, // coluna do painel de compra (--pdp-aside-width)
          gavetaDetalhes: { value: "680px" }, // gaveta "Detalhes / Tecido e cuidados" = 240 + 440
          colunaGaveta: { value: "240px" }, // coluna cinza da gaveta de detalhes
          pilulaCompra: { value: "280px" }, // pílula fixa "Adicionar à sacola"
          opcaoTamanho: { value: "86px" }, // botão de tamanho no celular (86 × 44)
          // Sacola e confirmação "Adicionado à sacola" (lululemon-sacola.md §2, §4 e §8)
          sacola: { value: "90rem" }, // 1440: contêiner da página da sacola
          fotoSacola: { value: "210px" }, // largura mínima da foto do item no desktop
          quantidadeSacola: { value: "134px" }, // pílula − n + (134 × 44)
          gavetaSacola: { value: "560px" }, // gaveta "Adicionado à sacola" e "Editar" no desktop
          dialogoSacola: { value: "480px" }, // diálogo "Remover da sacola" no desktop
          cabecalhoCompra: { value: "56px" }, // cabeçalho mínimo da sacola e do checkout
        },
        zIndex: {
          cabecalho: { value: "300" },
          pularConteudo: { value: "400" },
          painelProduto: { value: "2" }, // painel de compra por cima da galeria
          pilulaCompra: { value: "20" }, // pílula fixa da página de produto
          barraSacola: { value: "20" }, // barra fixa "Finalizar compra" da sacola no celular
          avisoSacola: { value: "30" }, // aviso "Desfazer" acima da barra fixa
        },
        durations: {
          rapida: { value: "120ms" },
          normal: { value: "200ms" },
          lenta: { value: "320ms" },
          // Movimento da referência (§5.8): 250 zoom de imagem e abas, 300 sublinhado e header do
          // celular, 500 gavetas, 600 véu do mega menu.
          zoom: { value: "250ms" },
          sublinhado: { value: "300ms" },
          gaveta: { value: "500ms" },
          veuMenu: { value: "600ms" },
          acordeao: { value: "300ms" }, // abrir e fechar as colunas do rodapé no celular
          controle: { value: "125ms" }, // botões sobre a galeria (opacidade)
          aparecer: { value: "250ms" }, // pílula fixa, setas do card e rótulo "Ver"
          modal: { value: "125ms" }, // diálogo central: fade-in-up de 50 px (lululemon-animacoes-edicao.md §1)
          // Transição de página: o antigo sai em 180 ms e o novo entra em 360 ms, 100 ms depois.
          saidaPagina: { value: "180ms" },
          entradaPagina: { value: "360ms" },
        },
        easings: {
          padrao: { value: "cubic-bezier(0.2, 0, 0, 1)" },
          assinatura: { value: "cubic-bezier(0.5, 0, 0, 1)" }, // gavetas, véu, header, sublinhados
          cruzar: { value: "cubic-bezier(0.65, 0, 0.35, 1)" }, // troca de foto do card de produto
          revelar: { value: "cubic-bezier(0.25, 0.46, 0.45, 0.94)" }, // letras do hero
          // Gavetas e véus (lululemon-animacoes-edicao.md §1): entram em ease-out e saem no inverso.
          entrada: { value: "ease-out" },
          saida: { value: "ease-in" },
          detalhes: { value: "cubic-bezier(0.2, 0, 0, 1)" }, // gaveta "Detalhes" da PDP
        },
        animations: {
          // PDP e cards: fotos entram com fade (500 ms), blocos do painel sobem de leve e o esqueleto brilha.
          aparecerFoto: { value: "escurecer 500ms cubic-bezier(0.2, 0, 0, 1) both" },
          entrarPainel: { value: "entrarItem 500ms cubic-bezier(0.2, 0, 0, 1) both" },
          brilhoEsqueleto: { value: "brilhoEsqueleto 2s ease-in-out infinite" },
          brilhoDestaque: { value: "brilhoDestaque 7s linear 3" },
          revelarLetra: { value: "revelarLetra 750ms cubic-bezier(0.25, 0.46, 0.45, 0.94) both" },
          subirSuave: { value: "subirSuave 750ms cubic-bezier(0.25, 0.46, 0.45, 0.94) both" },
          subirBotoes: { value: "subirBotoes 1s cubic-bezier(0.5, 0, 0, 1) both" },
          assentarSlide: { value: "assentarSlide 1s cubic-bezier(0.4, 0, 0.2, 1) both" },
          entrarColuna: { value: "entrarColuna 300ms cubic-bezier(0.5, 0, 0, 1) both" },
          surgir: { value: "surgir 200ms cubic-bezier(0.2, 0, 0, 1)" },
          escurecer: { value: "escurecer 200ms cubic-bezier(0.2, 0, 0, 1)" },
          entrarDireita: { value: "entrarDireita 320ms cubic-bezier(0.2, 0, 0, 1)" },
          avancarNivel: { value: "avancarNivel 240ms cubic-bezier(0.2, 0, 0, 1)" },
          subirDoca: { value: "subirDoca 520ms cubic-bezier(0.34, 1.56, 0.64, 1) both" },
          saltar: { value: "saltar 460ms cubic-bezier(0.34, 1.56, 0.64, 1) both" },
          abrirPainel: { value: "abrirPainel 360ms cubic-bezier(0.34, 1.4, 0.64, 1) both" },
          fecharPainel: { value: "fecharPainel 180ms cubic-bezier(0.4, 0, 1, 1) both" },
          entrarItem: { value: "entrarItem 320ms cubic-bezier(0.2, 0, 0, 1) both" },
          clarear: { value: "clarear 180ms linear both" },
          onda: { value: "onda 1600ms cubic-bezier(0.2, 0, 0, 1) infinite" },
          brilho: { value: "brilho 1400ms linear infinite" },
          piscar: { value: "piscar 1s ease-in-out infinite" },
          cinema: { value: "cinema 20s linear infinite both" },
          // Sacola: folha de baixo (celular), gaveta da direita (desktop) e véu, com o easing da assinatura.
          subirFolha: { value: "subirFolha 500ms cubic-bezier(0.5, 0, 0, 1)" },
          gavetaSacola: { value: "entrarDireita 500ms cubic-bezier(0.5, 0, 0, 1)" },
          veuSacola: { value: "escurecer 500ms cubic-bezier(0.5, 0, 0, 1)" },
          pulsar: { value: "pulsar 1.6s ease-in-out infinite" },
          // Transição de página (View Transitions e o fallback sem a API), no easing da assinatura.
          sairPagina: { value: "sairPagina 180ms cubic-bezier(0.5, 0, 0, 1) both" },
          entrarPagina: { value: "entrarPagina 360ms cubic-bezier(0.5, 0, 0, 1) 100ms both" },
          sairPaginaReduzida: { value: "sairPagina 100ms linear both" },
          aparecerPagina: { value: "aparecerPagina 150ms linear both" },
        },
        shadows: {
          suave: { value: "0 1px 3px rgba(29, 31, 27, 0.08), 0 1px 2px rgba(29, 31, 27, 0.04)" },
          media: { value: "0 12px 32px rgba(29, 31, 27, 0.12)" },
          // Anel de foco triplo da referência (§1.7), nas cores da marca.
          anelFoco: { value: "0 0 0 2px #FFFFFF, 0 0 0 3px #616D54, 0 0 0 5px #C9D1BD" },
        },
      },
      semanticTokens: {
        colors: {
          // Sálvia da marca (ERP: palette.sage). 600 nos botões: contraste AA com texto branco.
          marca: { value: "#616D54" }, // sage 600
          marcaContraste: { value: "#4D5743" }, // sage 700 (hover/pressionado)
          marcaSuave: { value: "#E6EADF" }, // sage 100 (selos, fundos de destaque)
          logo: { value: "#788569" }, // sage 500: cor exata da logo
          fundo: { value: "#FCFCF8" }, // neutral 25: branco quente
          fundoSutil: { value: "#F6F7F2" }, // neutral 50 (barra utilitária)
          veu: { value: "rgba(18, 20, 17, 0.4)" }, // escurece a página atrás de menus e painéis
          superficie: { value: "#FFFFFF" },
          superficieSuave: { value: "#EEEFE8" }, // neutral 100
          escuro: { value: "#1D1F1B" }, // neutral 900
          texto: { value: "#2F322C" }, // neutral 800
          textoSuave: { value: "#5F6459" }, // neutral 600
          textoSobreEscuro: { value: "#D2D5C9" }, // neutral 300
          divisoria: { value: "rgba(29, 31, 27, 0.08)" }, // linha fina sobre fundo claro (rodapé)
          // Blocos no lugar das fotos até as fotos reais do ateliê chegarem.
          placeholder: { value: "#E3E5DC" }, // neutral 200
          placeholderForte: { value: "#D2D5C9" }, // neutral 300
          // Fundo de estúdio das fotos de produto: linho claro com um sopro de sálvia.
          fundoProduto: { value: "#F4F6F0" }, // sage 50
          borda: { value: "#E3E5DC" }, // neutral 200
          sucesso: { value: "#3D7A4F" },
          alerta: { value: "#8A5417" }, // tom pêssego do ERP com contraste AA sobre fundo claro
          erro: { value: "#B03A26" }, // perigo do ERP escurecido para AA
          link: { value: "#3E6F8E" }, // info do ERP
          promocao: { value: "#C65D3B" }, // terracota do ERP: selos de oferta e novidade
          // Fundos claros dos selos de situação (pedidos), nos tons pastel do ERP
          sucessoSuave: { value: "#EFF6EF" },
          alertaSuave: { value: "#FDF5EC" },
          linkSuave: { value: "#F0F5FB" },
          whatsapp: { value: "#25D366" }, // cor oficial do WhatsApp (só no ícone do atalho)
          // Fundo único do banner principal da home: fica fixo atrás do carrossel e desce por trás dos
          // cards de categoria, então todos os slides usam a mesma cor.
          fundoBanner: { value: "#4D5743" }, // sage 700
          // Formas que dão ritmo aos slides (pedestal, faixa, círculo, anéis), nos tons do fundo.
          fundoBannerClaro: { value: "#616D54" }, // sage 600
          fundoBannerEscuro: { value: "#3C4435" }, // sage 800
          linhaSobreBanner: { value: "rgba(255, 255, 255, 0.22)" },
          // Cabeçalho em pílula e home (lululemon-referencia.md §5.5), nos neutros da marca.
          vidroCabecalho: { value: "rgba(246, 247, 242, 0.8)" }, // fundoSutil a 80%, com desfoque
          veuMenu: { value: "rgba(29, 31, 27, 0.5)" }, // véu do mega menu e das gavetas
          controleEscuro: { value: "rgba(29, 31, 27, 0.66)" }, // pausar e setas sobre foto
          controleEscuroHover: { value: "rgba(29, 31, 27, 0.9)" },
          controleClaro: { value: "rgba(255, 255, 255, 0.8)" }, // botão redondo claro sobre foto
          vidroEscuro: { value: "rgba(29, 31, 27, 0.4)" }, // cartão de vidro do atendimento
          textoVidro: { value: "rgba(255, 255, 255, 0.8)" }, // texto de apoio no cartão de vidro
          recorteVidro: { value: "rgba(12, 10, 8, 0.92)" }, // "notch" do cartão em forma de celular
          // Foto de espera do atendimento: ambiente quente e desfocado (luz âmbar, linho e rosa antigo
          // sobre marrom profundo), escurecida pelo véu para o vidro se destacar.
          aconchego: {
            profundo: { value: "#221A15" },
            sombra: { value: "#3B2B21" },
            ambar: { value: "#A0703F" },
            linho: { value: "#CDAE88" },
            rosado: { value: "#7E5048" },
          },
          // Rodapé (§4): fundo escuro e quente, texto branco e divisórias finas no celular.
          fundoRodape: { value: "#1E1A16" },
          textoSobreRodape: { value: "#D9D1C6" }, // linha legal (contraste 12:1 sobre o fundo)
          divisoriaSobreEscuro: { value: "rgba(255, 255, 255, 0.18)" },
          desabilitado: { value: "#9A9E92" }, // seta sem próximo slide
          contornoAmostra: { value: "rgba(29, 31, 27, 0.5)" }, // borda da amostra de cor
          // Cores dos tecidos (amostras dos cards e "Compre por cor").
          tecido: {
            rose: { value: "#E9C9C3" },
            azulBebe: { value: "#C6D7E3" },
            salvia: { value: "#AEB8A0" },
            cru: { value: "#EDE6D6" },
            cinza: { value: "#C9CAC4" },
            branco: { value: "#FFFFFF" },
          },
          // Papéis de interface
          destaque: { value: "{colors.marca}" }, // CTA principal (Comprar, Finalizar)
          sobreDestaque: { value: "#FFFFFF" },
          foco: { value: "{colors.marca}" },
        },
      },
    },
  },

  globalCss: {
    // Texto só para leitor de tela (`srOnly`, absoluto): ancorado no canto do bloco de contenção.
    // Sem top/left ele fica na posição estática (ex.: no fim de uma lista rolável) e, quando o bloco
    // de contenção está fora do recorte, estica a área de rolagem da página ou do painel.
    ".sr_true": { top: "0", left: "0" },
    "html, body": {
      bg: "fundo",
      color: "texto",
      fontFamily: "corpo",
      WebkitFontSmoothing: "antialiased",
      textRendering: "optimizeLegibility",
    },
    "h1, h2, h3, h4": { fontFamily: "titulo", color: "escuro" },
    // Diálogo modal aberto (gavetas, menu do celular, visualizador): a página atrás não rola. html em
    // hidden (como a referência) e body em clip, que trava sem virar contêiner de rolagem (o cabeçalho
    // sticky não salta). scrollbar-gutter guarda o espaço da barra de rolagem: a página não "pula".
    "html:has(dialog[open]:modal)": { overflow: "hidden", scrollbarGutter: "stable" },
    "html:has(dialog[open]:modal) body": { overflow: "clip" },
    // Barra fixa do celular (carrinho): o fim da página não fica escondido atrás dela.
    "body:has([data-barra-fixa])": { pb: { base: "[calc(76px + env(safe-area-inset-bottom))]", lg: "0" } },
    ":focus-visible": { outline: "2px solid", outlineColor: "foco", outlineOffset: "2px" },
    "::selection": { bg: "marcaSuave", color: "escuro" },
    "@media (prefers-reduced-motion: reduce)": {
      "*, *::before, *::after": { animationDuration: "0.01ms !important", transitionDuration: "0.01ms !important" },
      // Transição de página sem deslocamento: só um fade curto.
      "::view-transition-old(.loja-sai)": { animation: "sairPaginaReduzida" },
      "::view-transition-new(.loja-entra)": { animation: "aparecerPagina" },
    },
    // Transição de página (src/loja/componentes/layout/TransicaoPagina.tsx). O React aplica as classes
    // loja-sai/loja-entra ao conteúdo que sai e ao que entra; o resto da página (raiz: faixa e rodapé)
    // troca na hora, sem cross-fade, e o cabeçalho e as gavetas abertas ficam parados por cima.
    // Cliques durante a animação vão para a página nova (o overlay não captura o ponteiro).
    "::view-transition": { pointerEvents: "none" },
    "::view-transition-group(root)": { animation: "none" },
    "::view-transition-old(root)": { display: "none" },
    "::view-transition-new(root)": { animation: "none" },
    "::view-transition-old(.loja-sai)": { animation: "sairPagina" },
    "::view-transition-new(.loja-entra)": { animation: "entrarPagina" },
    "::view-transition-group(loja-cabecalho)": { animation: "none", zIndex: "1" },
    "::view-transition-old(loja-cabecalho)": { display: "none" },
    "::view-transition-new(loja-cabecalho)": { animation: "none" },
    "::view-transition-group(*.loja-dialogo)": { animation: "none", zIndex: "2" },
    "::view-transition-old(*.loja-dialogo)": { display: "none" },
    "::view-transition-new(*.loja-dialogo)": { animation: "none" },
    // Sem a API (navegadores antigos): o conteúdo novo só entra com o mesmo fade + 8 px ao remontar.
    "@supports not (view-transition-name: none)": {
      "[data-transicao-pagina][data-entrando]": { animation: "entrarPagina" },
    },
    // O foco vai para o título (ou o conteúdo) da página nova: sem anel nesse foco programático.
    "[data-transicao-pagina]:focus, [data-transicao-pagina] h1[tabindex='-1']:focus": { outline: "none" },
  },
});
