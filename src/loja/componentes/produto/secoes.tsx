import { css, cx } from "styled-system/css";
import { CardProduto } from "@/loja/componentes/inicio/CardProduto";
import { Carrossel } from "@/loja/componentes/inicio/Carrossel";
import { botaoSecundario, scrim } from "@/loja/componentes/inicio/estilos";
import { Midia } from "@/loja/componentes/inicio/Midia";
import type { Produto } from "@/loja/lib/catalogo/exemplos";
import { EMPRESA } from "@/loja/lib/empresa";
import { revelarAoRolar } from "./movimento";

// O painelComum é Client Component: aqui o link do WhatsApp é montado no servidor.
const linkWhatsapp = (texto: string) => `https://wa.me/${EMPRESA.whatsapp.numero}?text=${encodeURIComponent(texto)}`;

// Partes de servidor da página de produto abaixo da dobra (lululemon-pdp.md §1.6 e §6), na ordem:
// "Pensado para", "Por que você vai amar", faixa "Fale com o ateliê", hero editorial da linha e
// "Você também pode gostar". As partes interativas (gaveta de detalhes, destaques, conjuntos e
// avaliações) ficam nos próprios arquivos.

// Recuo lateral das seções da página de produto: 12 (celular), 20 (tablet), 24 (desktop).
export const recuo = css({ px: { base: "3", md: "5", desktop: "6" } });

const rotulo = css({ fontSize: "sm", fontWeight: "medium", lineHeight: "texto", color: "escuro" });

export function PensadoPara({ uso }: { uso: string }) {
  return (
    <section aria-labelledby="titulo-pensado" className={cx(recuo, revelarAoRolar, css({ mt: { base: "12", desktop: "16" } }))}>
      <h2 id="titulo-pensado" className={rotulo}>
        Pensado para
      </h2>
      <p className={textoUso}>{uso}</p>
    </section>
  );
}

// Uso em 40/48 (−2%); ~32 no celular.
const textoUso = css({
  mt: "2",
  fontSize: { base: "blocoTablet", desktop: "bloco" },
  fontWeight: "normal",
  lineHeight: "bloco",
  letterSpacing: "bloco",
  color: "escuro",
});

// Parágrafo enorme (64/70.4, −4%) em ~60% da largura; 36/40 no celular.
export function PorQueVaiAmar({ texto }: { texto: string }) {
  return (
    <section aria-labelledby="titulo-amar" className={cx(recuo, revelarAoRolar, css({ mt: { base: "12", desktop: "24" } }))}>
      <h2 id="titulo-amar" className={rotulo}>
        Por que você vai amar
      </h2>
      <p className={textoGrande}>{texto}</p>
    </section>
  );
}

const textoGrande = css({
  mt: "4",
  maxW: { desktop: "[60%]" },
  fontSize: { base: "4xl", md: "secaoTablet", desktop: "secao" },
  lineHeight: "titulo",
  letterSpacing: "titulo",
  color: "escuro",
  textWrap: "pretty",
});

// Faixa "Fale com o ateliê" (no lugar do "Chat with a product expert"): fundo claro, largura total,
// 192 de altura, título de 64 e texto de 16 à esquerda, botão de contorno em pílula à direita.
export function FaleComAtelie({ nome }: { nome: string }) {
  return (
    <section aria-labelledby="titulo-fale" className={cx(faixa, revelarAoRolar)}>
      <div>
        <h2 id="titulo-fale" className={tituloFaixa}>
          Fale com o ateliê
        </h2>
        <p className={css({ mt: "2", fontSize: "md", lineHeight: "texto", color: "texto" })}>
          Dúvidas sobre medidas, cores ou bordado? Quem faz a peça responde pelo WhatsApp.
        </p>
      </div>
      <a
        href={linkWhatsapp(`Olá! Tenho uma dúvida sobre ${nome}.`)}
        target="_blank"
        rel="noreferrer"
        className={cx(botaoSecundario, css({ flexShrink: "0" }))}
      >
        Chamar no WhatsApp
        <span className={css({ srOnly: true })}> (abre em nova aba)</span>
      </a>
    </section>
  );
}

const faixa = css({
  display: "flex",
  flexDirection: { base: "column", md: "row" },
  alignItems: { base: "flex-start", md: "center" },
  justifyContent: "space-between",
  gap: "6",
  minH: { desktop: "[192px]" },
  mt: { base: "16", desktop: "24" },
  px: { base: "3", md: "5", desktop: "6" },
  py: { base: "10", desktop: "8" },
  bg: "fundoProduto",
});

const tituloFaixa = css({
  fontSize: { base: "4xl", md: "secaoTablet", desktop: "secao" },
  fontWeight: "normal",
  lineHeight: "titulo",
  letterSpacing: "titulo",
  color: "escuro",
});

// Hero editorial em largura total com o nome da linha centralizado em branco. A mídia anda com a
// rolagem (parallax por view-timeline, lululemon-animacoes-edicao.md §1).
export function HeroLinha({ linha }: { linha: string }) {
  return (
    <section aria-label={`Linha ${linha}`} className={css({ position: "relative", mt: { base: "16", desktop: "24" } })}>
      <Midia tom="salvia" icone="agulha" iconeNoAlto parallax className={css({ h: { base: "[120vw]", md: "[80vh]" }, maxH: "[900px]" })} />
      <span aria-hidden className={scrim} />
      <div className={conteudoHero}>
        <p className={css({ fontSize: "sm", fontWeight: "medium", letterSpacing: "normal" })}>Linha</p>
        <p className={css({ mt: "2", fontSize: { base: "heroCelular", md: "secao" }, lineHeight: "titulo", letterSpacing: "titulo" })}>{linha}</p>
      </div>
    </section>
  );
}

const conteudoHero = css({
  position: "absolute",
  inset: "0",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  px: "6",
  color: "superficie",
  textAlign: "center",
});

// "Você também pode gostar": título de 64 + subtítulo de 14 e o carrossel de cards da home (4 + espiada
// no desktop, 1 + espiada no celular) com as setas de contorno embaixo à direita.
export function VoceTambem({ produtos }: { produtos: Produto[] }) {
  if (produtos.length === 0) return null;
  return (
    <section aria-labelledby="titulo-gostar" className={cx(revelarAoRolar, css({ my: { base: "16", desktop: "24" }, containerType: "inline-size" }))}>
      <div className={css({ px: { base: "3", md: "5", desktop: "6" }, mb: { base: "8", desktop: "12" } })}>
        <h2 id="titulo-gostar" className={tituloFaixa}>
          Você também pode gostar
        </h2>
        <p className={css({ mt: "2", fontSize: "sm", color: "textoSuave" })}>Peças do ateliê que combinam com esta.</p>
      </div>
      <Carrossel rotulo="Você também pode gostar" classeTrilho={trilho} classeSetas={css({ px: { base: "3", md: "5", desktop: "6" } })}>
        {produtos.map((produto) => (
          <li key={produto.slug} className={item}>
            <CardProduto produto={produto} sizes="(min-width: 992px) 22vw, (min-width: 768px) 42vw, 72vw" />
          </li>
        ))}
      </Carrossel>
    </section>
  );
}

const trilho = css({ gap: { base: "3", md: "5" }, px: { base: "3", md: "5" }, scrollPaddingInline: { base: "3", md: "5" } });

// Mesma largura dos cards do carrossel da home (inicio/CarrosselProdutos).
const item = css({
  w: {
    base: "[calc(100cqw - 112px)]",
    md: "[calc((100cqw - max(min(12cqw, 200px), 15cqw) - 20px) / 2)]",
    desktop: "[calc((100cqw - max(min(12cqw, 200px), 7.5cqw) - 60px) / 4)]",
  },
});

export { CardProduto as CardVitrine, VitrineSugestoes } from "./Vitrine";
