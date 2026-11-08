import { css, cx } from "styled-system/css";
import { InstagramLogo, Play, Stack } from "@/loja/componentes/icones";
import type { PostInstagram } from "@/loja/lib/instagram/feed";
import { postsDoInstagram } from "@/loja/lib/instagram/servidor";
import { INSTAGRAM } from "./conteudo";
import { botaoPrimario, margens, rubrica, textoGrande } from "./estilos";

// Seção do Instagram, a última da home (no lugar da antiga faixa de marca): bloco em linho com a
// rubrica, o @ do perfil, a assinatura em Scarlett (sem acento) e o botão "Seguir no Instagram"; abaixo,
// a grade com os posts reais (6 colunas no desktop, 4 no tablet e 3 no celular, cada uma com até 2
// linhas). Cada post abre o permalink numa nova aba; no hover (ou foco) aparece um trecho da legenda e
// o vídeo/carrossel tem um ícone discreto no canto.
// Sem token ou com a API fora do ar: nenhum post fingido, só o convite (o erro fica no log do servidor).
// Server Component assíncrono: a busca tem cache de 1 h (src/loja/lib/instagram).
export async function SecaoInstagram() {
  const feed = await postsDoInstagram();
  const posts = feed.ok ? feed.posts : [];
  return (
    <section aria-labelledby="titulo-instagram" className={cx(secao, margens)}>
      <div className={cabecalho}>
        <div>
          <p className={rubrica}>No Instagram</p>
          <h2 id="titulo-instagram" className={arroba}>
            {INSTAGRAM.arroba}
          </h2>
          <p className={assinatura}>{INSTAGRAM.assinatura}</p>
          {posts.length === 0 && <p className={cx(textoGrande, css({ mt: "4", maxW: "[560px]" }))}>{INSTAGRAM.texto}</p>}
        </div>
        <a href={INSTAGRAM.acao.href} target="_blank" rel="noopener noreferrer" className={cx(botaoPrimario, css({ flexShrink: "0" }))}>
          <InstagramLogo size={16} aria-hidden /> {INSTAGRAM.acao.rotulo}
          <span className={css({ srOnly: true })}> (abre em nova aba)</span>
        </a>
      </div>

      {posts.length > 0 && (
        <ul aria-label={`Posts recentes de ${INSTAGRAM.arroba}`} className={grade}>
          {posts.map((post, indice) => (
            <li key={post.id} className={indice >= 8 ? soDesktop : indice >= 6 ? doTabletEmDiante : undefined}>
              <Post post={post} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const ROTULO_TIPO = { imagem: "Foto", video: "Vídeo", carrossel: "Álbum" } as const;

function Post({ post }: { post: PostInstagram }) {
  const descricao = post.trecho || `${ROTULO_TIPO[post.tipo]} do Instagram do ateliê`;
  return (
    <a href={post.link} target="_blank" rel="noopener noreferrer" className={cx("group", cartao)}>
      {/* Imagem pela rota própria (a URL da CDN do Instagram expira). Sem next/image: o otimizador
          buscaria a rota pelo host do ERP, e a imagem já vem no tamanho do Instagram (~1080 px). */}
      {/* biome-ignore lint/performance/noImgElement: imagem servida pela rota proxy /api/instagram */}
      <img src={post.imagem} alt={descricao} width={480} height={600} loading="lazy" decoding="async" className={foto} />
      {post.tipo !== "imagem" && (
        <span aria-hidden className={icone}>
          {post.tipo === "video" ? <Play size={14} weight="fill" /> : <Stack size={14} weight="fill" />}
        </span>
      )}
      <span aria-hidden className={legenda}>
        <span className={css({ lineClamp: "4" })}>{post.trecho || ROTULO_TIPO[post.tipo]}</span>
      </span>
      <span className={css({ srOnly: true })}>
        {ROTULO_TIPO[post.tipo]} no Instagram (abre em nova aba)
      </span>
    </a>
  );
}

// Bloco em linho de ponta a ponta (fundo alternado da marca), colado ao rodapé.
const secao = css({
  mt: { base: "16", desktop: "24" },
  py: { base: "12", desktop: "16" },
  bg: "linho",
});

const cabecalho = css({
  display: "flex",
  flexDirection: { base: "column", md: "row" },
  alignItems: { base: "flex-start", md: "flex-end" },
  justifyContent: "space-between",
  gap: { base: "6", md: "8" },
  maxW: "grade",
  mx: "auto",
});

const arroba = css({
  fontFamily: "titulo",
  fontWeight: "normal",
  fontSize: { base: "3xl", md: "blocoTablet", desktop: "bloco" },
  lineHeight: "bloco",
  letterSpacing: "bloco",
  color: "escuro",
  overflowWrap: "anywhere",
});

// Scarlett (fonte da marca): frase curta e SEM acento.
const assinatura = css({
  mt: "2",
  fontFamily: "marca",
  fontWeight: "normal",
  fontSize: { base: "3xl", desktop: "4xl" },
  lineHeight: "titulo",
  color: "marca",
});

// 3 colunas no celular, 4 no tablet e 6 no desktop; no máximo 2 linhas em cada largura.
const grade = css({
  display: "grid",
  gridTemplateColumns: {
    base: "[repeat(3, minmax(0, 1fr))]",
    md: "[repeat(4, minmax(0, 1fr))]",
    desktop: "[repeat(6, minmax(0, 1fr))]",
  },
  gap: { base: "2", md: "3" },
  maxW: "grade",
  mx: "auto",
  mt: { base: "8", desktop: "10" },
});

// Posts 7 e 8 a partir do tablet; 9 a 12 só no desktop (2 linhas cheias em cada largura).
const doTabletEmDiante = css({ display: { base: "none", md: "block" } });
const soDesktop = css({ display: { base: "none", desktop: "block" } });

// 4:5, como a grade atual do perfil. Cantos suaves (a referência é reta).
const cartao = css({
  position: "relative",
  display: "block",
  aspectRatio: "[4 / 5]",
  overflow: "hidden",
  borderRadius: "midia",
  bg: "placeholder",
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

const foto = css({
  w: "full",
  h: "full",
  objectFit: "cover",
  transitionProperty: "transform",
  transitionDuration: "zoom",
  transitionTimingFunction: "assinatura",
  "@media (hover: hover)": { _groupHover: { transform: "scale(1.04)" } },
  _motionReduce: { transitionProperty: "none", _groupHover: { transform: "none" } },
});

const icone = css({
  position: "absolute",
  top: "2",
  right: "2",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  w: "6",
  h: "6",
  borderRadius: "pilula",
  bg: "controleEscuro",
  color: "superficie",
});

// Trecho da legenda sobre um véu escuro (branco sobre ~80% de escuro: contraste AA), só no hover/foco.
const legenda = css({
  position: "absolute",
  inset: "0",
  display: "flex",
  alignItems: "flex-end",
  p: { base: "2", md: "3" },
  bg: "controleEscuroHover",
  color: "superficie",
  fontSize: "xs",
  lineHeight: "texto",
  opacity: "0",
  transitionProperty: "opacity",
  transitionDuration: "aparecer",
  transitionTimingFunction: "assinatura",
  "@media (hover: hover)": { _groupHover: { opacity: "1" } },
  _groupFocusVisible: { opacity: "1" },
});
