import Image from "next/image";
import Link from "next/link";
import { css, cx } from "styled-system/css";
import { CATEGORIAS_PROPAGANDAS_PROJETOS, PROPAGANDAS_PROJETOS, type PropagandaCasa } from "@/loja/lib/casas/propagandas";
import { PlaceholderProjeto } from "./PlaceholderProjeto";

export type { PropagandaCasa };

// Card e ligação provisória das propagandas da área Projetos (dados em src/loja/lib/casas/propagandas.ts)
// com a grade de produtos. Mesmo formato dos cards de campanha em GradeListagem: imagem inteira,
// título de 40 px e texto, com 3 estilos. Sem foto, o fundo é o placeholder claro com o ícone de bebê
// e o texto fica escuro. Nomes "Casa" mantidos por compatibilidade (GradeListagem importa estes).

// Só nas listagens de kit berço e quarto (a semente da grade começa pela categoria): a 1ª
// propaganda da página e, depois, uma sim, uma não viram propaganda de projeto. O anúncio gira
// pela semente, então cada categoria abre com um diferente. Devolve índice da célula →
// propaganda de projeto; as demais células seguem com as propagandas da própria grade.
export function propagandasDeCasas(semente: string, celulas: Array<{ tipo: string; indice?: number }>): Map<number, PropagandaCasa> {
  const escolhidas = new Map<number, PropagandaCasa>();
  const raiz = semente.split(/[/:]/)[0];
  if (!(CATEGORIAS_PROPAGANDAS_PROJETOS as readonly string[]).includes(raiz)) return escolhidas;
  let deslocamento = 0;
  for (const letra of semente) deslocamento = (deslocamento * 31 + letra.charCodeAt(0)) % PROPAGANDAS_PROJETOS.length;
  let exibidas = 0;
  for (const celula of celulas) {
    if (celula.tipo !== "propaganda" || celula.indice === undefined) continue;
    if (exibidas % 2 === 0) escolhidas.set(celula.indice, PROPAGANDAS_PROJETOS[(deslocamento + exibidas / 2) % PROPAGANDAS_PROJETOS.length]);
    exibidas += 1;
  }
  return escolhidas;
}

// estilo 0 e 1: texto embaixo; 2: texto no topo. Com foto: degradê escuro e texto branco.
export function CardPropagandaCasa({ titulo, apoio, href, acao, foto, alt, estilo }: PropagandaCasa & { estilo: number }) {
  const topo = estilo % 3 === 2;
  return (
    <Link
      href={href}
      className={cx("group", cartao, foto ? comFoto : semFoto, topo ? css({ alignItems: "flex-start" }) : css({ alignItems: "flex-end" }))}
    >
      {foto ? (
        <>
          <Image
            src={foto}
            alt={alt}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className={css({
              objectFit: "cover",
              transition: "transform",
              transitionDuration: "lenta",
              _groupHover: { transform: "scale(1.03)" },
            })}
          />
          <span aria-hidden className={cx(veu, topo ? veuTopo : veuBase)} />
        </>
      ) : (
        <PlaceholderProjeto nome={alt} tom={estilo} tamanho={96} className={css({ pb: topo ? "0" : "[40%]", pt: topo ? "[40%]" : "0" })} />
      )}
      <span className={css({ position: "relative", display: "block" })}>
        <span className={css({ display: "block", fontSize: { base: "3xl", lg: "4xl" }, lineHeight: "[1.2]", letterSpacing: "[-0.02em]" })}>
          {titulo}
        </span>
        <span className={css({ display: "block", mt: "2", fontSize: { base: "md", lg: "xl" }, lineHeight: "snug", maxW: "[28ch]" })}>
          {apoio}
        </span>
        <span
          className={css({
            display: "inline-block",
            mt: "5",
            fontSize: "sm",
            fontWeight: "medium",
            textDecoration: "underline",
            textUnderlineOffset: "4px",
          })}
        >
          {acao}
        </span>
      </span>
    </Link>
  );
}

export { CardPropagandaCasa as CardPropagandaProjeto, propagandasDeCasas as propagandasDeProjetos };

const cartao = css({
  position: "relative",
  display: "flex",
  h: "full",
  minH: { base: "[420px]", md: "[520px]" },
  p: { base: "6", lg: "10" },
  overflow: "hidden",
});

const comFoto = css({ bg: "escuro", color: "fundo" });
const semFoto = css({ color: "escuro" });

const veu = css({ position: "absolute", inset: "0" });
const veuBase = css({
  backgroundImage: "[linear-gradient(to top, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0.25) 55%, rgba(0, 0, 0, 0) 80%)]",
});
const veuTopo = css({
  backgroundImage: "[linear-gradient(to bottom, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.2) 50%, rgba(0, 0, 0, 0) 75%)]",
});
