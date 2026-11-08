import Link from "next/link";
import type { ReactNode } from "react";
import { css } from "styled-system/css";
import { ColunaRodape } from "@/loja/componentes/layout/rodape/ColunaRodape";
import { EMPRESA } from "@/loja/lib/empresa";

type LinkCompra = { rotulo: string; href: string; externo?: boolean };

const WHATSAPP = `https://wa.me/${EMPRESA.whatsapp.numero}`;

const COLUNAS: Array<{ titulo: string; links: LinkCompra[] }> = [
  {
    titulo: "Ajuda",
    links: [
      { rotulo: "Entregas e frete", href: "/ajuda/entregas" },
      { rotulo: "Trocas e devoluções", href: "/ajuda/trocas-e-devolucoes" },
      { rotulo: "Bordado personalizado", href: "/ajuda/bordado-personalizado" },
      { rotulo: "Perguntas frequentes", href: "/ajuda/perguntas-frequentes" },
    ],
  },
  {
    titulo: "Legal",
    links: [
      { rotulo: "Privacidade", href: "/politicas/privacidade" },
      { rotulo: "Termos de uso", href: "/politicas/termos" },
      { rotulo: "Cookies", href: "/politicas/cookies" },
      { rotulo: "Política de trocas", href: "/politicas/trocas" },
    ],
  },
  {
    titulo: "Contato",
    links: [
      { rotulo: `WhatsApp ${EMPRESA.whatsapp.exibicao}`, href: WHATSAPP, externo: true },
      { rotulo: EMPRESA.emailAtendimento, href: `mailto:${EMPRESA.emailAtendimento}` },
    ],
  },
];

async function anoAtual(): Promise<number> {
  return new Date().getFullYear();
}

// Rodapé ENXUTO da sacola e do checkout (lululemon-sacola.md §1): só Ajuda, Legal e Contato, em
// acordeões no celular (ColunaRodape, o mesmo do rodapé da loja) e em colunas a partir de 768, mais
// a linha legal com razão social, CNPJ e endereço (Decreto 7.962/2013).
export async function RodapeCompra() {
  return (
    <footer className={rodape}>
      <nav aria-label="Ajuda e políticas" className={menu}>
        {COLUNAS.map((coluna) => (
          <ColunaRodape key={coluna.titulo} titulo={coluna.titulo}>
            <ul className={lista}>
              {coluna.links.map((link) => (
                <li key={link.href}>
                  <LinkCompra {...link} />
                </li>
              ))}
              {coluna.titulo === "Contato" && (
                <li className={css({ fontSize: "sm", lineHeight: "texto", color: "textoSobreRodape" })}>
                  Ateliê em {EMPRESA.cidade}/{EMPRESA.uf}
                </li>
              )}
            </ul>
          </ColunaRodape>
        ))}
      </nav>
      <div className={linhaLegal}>
        <p className={css({ fontSize: "sm", lineHeight: "texto" })}>
          © {await anoAtual()} {EMPRESA.razaoSocial} · <span className={css({ whiteSpace: "nowrap" })}>CNPJ {EMPRESA.cnpj}</span>
        </p>
        <p className={css({ mt: "1", fontSize: "xs", lineHeight: "texto", color: "textoSobreRodape" })}>{EMPRESA.endereco}</p>
      </div>
    </footer>
  );
}

function LinkCompra({ rotulo, href, externo }: LinkCompra): ReactNode {
  if (externo || href.startsWith("mailto:")) {
    return (
      <a
        href={href}
        className={link}
        {...(externo ? { target: "_blank", rel: "noopener", "aria-label": `${rotulo} (abre em nova aba)` } : {})}
      >
        {rotulo}
      </a>
    );
  }
  return (
    <Link href={href} className={link}>
      {rotulo}
    </Link>
  );
}

const rodape = css({ mt: "auto", bg: "fundoRodape", color: "superficie" });

const menu = css({
  display: "grid",
  gridTemplateColumns: { base: "[minmax(0, 1fr)]", md: "[repeat(3, minmax(0, token(sizes.colunaRodape)))]" },
  columnGap: "5",
  mt: { base: "4", md: "8" },
  mx: { base: "3", md: "0" },
  px: { base: "0", md: "5", desktop: "10" },
  // Celular: pesponto em cima (as divisórias dos acordeões também são de pesponto, ColunaRodape).
  bgImage: {
    base: "[repeating-linear-gradient(90deg, token(colors.pespontoSobreEscuro) 0 6px, transparent 6px 10px)]",
    md: "none",
  },
  bgSize: "[100% 1px]",
  bgRepeat: "no-repeat",
  bgPosition: "top",
});

const lista = css({ display: "grid", gap: "2", justifyItems: "start" });

const link = css({
  fontSize: "sm",
  lineHeight: "texto",
  color: "superficie",
  overflowWrap: "anywhere",
  textDecorationThickness: "1px",
  textUnderlineOffset: "[4px]",
  _hover: { textDecoration: "underline" },
  _focusVisible: { outline: "[2px solid]", outlineColor: "superficie", outlineOffset: "[2px]", borderRadius: "xs" },
});

const linhaLegal = css({
  px: { base: "3", md: "5", desktop: "10" },
  pt: { base: "8", md: "12" },
  pb: { base: "8", md: "12" },
});
