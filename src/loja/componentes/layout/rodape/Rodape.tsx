import Link from "next/link";
import type { ReactNode } from "react";
import { css } from "styled-system/css";
import { InstagramLogo, LinktreeLogo } from "@/loja/componentes/icones";
import { LINKS_UTILITARIOS } from "@/loja/componentes/layout/cabecalho/navegacao";
import { EMPRESA, REDES_SOCIAIS } from "@/loja/lib/empresa";
import { ColunaRodape } from "./ColunaRodape";

type LinkRodape = { rotulo: string; href: string; externo?: boolean };

const WHATSAPP = `https://wa.me/${EMPRESA.whatsapp.numero}`;

// Rotas que ainda não existem apontam para o endereço planejado (/ajuda/..., /conta/..., /politicas/...).
const COLUNAS: Array<{ titulo: string; links: LinkRodape[] }> = [
  {
    titulo: "Minha conta",
    links: [
      LINKS_UTILITARIOS.entrar,
      LINKS_UTILITARIOS.cadastro,
      { rotulo: "Meus pedidos", href: "/conta/pedidos" },
      { rotulo: "Clube Milena", href: "/conta/clube" },
      { rotulo: "Favoritos", href: "/conta/favoritos" },
    ],
  },
  {
    titulo: "Ajuda",
    links: [
      { rotulo: "Fale no WhatsApp", href: WHATSAPP, externo: true },
      { rotulo: "Entregas", href: "/ajuda/entregas" },
      { rotulo: "Trocas e devoluções", href: "/ajuda/trocas-e-devolucoes" },
      { rotulo: "Guia de medidas do berço", href: "/ajuda/guia-de-medidas" },
      { rotulo: "Bordado personalizado", href: "/ajuda/bordado-personalizado" },
      { rotulo: "Perguntas frequentes", href: "/ajuda/perguntas-frequentes" },
    ],
  },
  {
    titulo: "Legal",
    links: [
      { rotulo: "Privacidade", href: "/politicas/privacidade" },
      { rotulo: "Termos", href: "/politicas/termos" },
      { rotulo: "Cookies", href: "/politicas/cookies" },
      { rotulo: "Política de trocas", href: "/politicas/trocas" },
    ],
  },
  {
    titulo: "Sobre o ateliê",
    links: [
      { rotulo: "Nossa história", href: "/sobre" },
      { rotulo: "Projetos de quartinho", href: "/projetos" },
      LINKS_UTILITARIOS.loja,
      { rotulo: "Tecidos e cuidados", href: "/ajuda/tecidos-e-cuidados" },
    ],
  },
];

const LEGAIS: LinkRodape[] = [
  { rotulo: "Privacidade", href: "/politicas/privacidade" },
  { rotulo: "Termos", href: "/politicas/termos" },
];

// Ano do rodapé (a loja não usa Cache Components, que exigiria Suspense nas páginas do ERP).
async function anoAtual(): Promise<number> {
  return new Date().getFullYear();
}

// Rodapé no modelo da shop.lululemon.com (lululemon-referencia.md §4 e §6, item 20):
// - fundo escuro e quente, texto branco;
// - menu com 32 de margem em cima e 40 nas laterais, em 6 colunas de 210 px com vão de 20 (desktop),
//   3 colunas no tablet (laterais de 20) e acordeões de 64 px no celular (laterais de 12);
// - títulos 14/500 com 12 de margem; links 14/400 em grade com vão de 8 e sublinhado que surge no hover
//   (fade de 300 ms, como no cabeçalho);
// - linha legal com 64 × 40 de respiro em space-between: razão social, CNPJ e endereço (Decreto
//   7.962/2013) à esquerda; Privacidade e Termos à direita, com 16 entre eles.
// Server Component: só o abrir e fechar dos acordeões (ColunaRodape) roda no navegador.
export async function Rodape() {
  return (
    <footer className={rodape}>
      <nav aria-label="Rodapé" className={menu}>
        {COLUNAS.map((coluna) => (
          <ColunaRodape key={coluna.titulo} titulo={coluna.titulo}>
            <ul className={lista}>
              {coluna.links.map((link) => (
                <li key={link.href}>
                  <LinkRodape {...link} />
                </li>
              ))}
            </ul>
          </ColunaRodape>
        ))}

        <ColunaRodape titulo="Contato">
          <ul className={lista}>
            <li>
              <LinkRodape rotulo={`WhatsApp ${EMPRESA.whatsapp.exibicao}`} href={WHATSAPP} externo />
            </li>
            <li>
              {/* Quebra depois do "@" quando a coluna estreita (1200 px) não comporta o endereço inteiro. */}
              <LinkRodape rotulo={EMPRESA.emailAtendimento} href={`mailto:${EMPRESA.emailAtendimento}`}>
                {EMPRESA.emailAtendimento.split("@")[0]}@<wbr />
                {EMPRESA.emailAtendimento.split("@")[1]}
              </LinkRodape>
            </li>
            <li>
              <address className={css({ fontSize: "sm", lineHeight: "texto", fontStyle: "normal", color: "superficie" })}>
                Ateliê em {EMPRESA.cidade}/{EMPRESA.uf}
              </address>
            </li>
          </ul>
        </ColunaRodape>

        {/* No celular, o grupo de redes fica aberto (como o de newsletter na referência). */}
        <ColunaRodape titulo="Redes sociais" abertoInicial>
          <ul className={lista}>
            <li>
              <LinkRodape rotulo="Instagram" href={REDES_SOCIAIS.instagram} externo icone={<InstagramLogo size={20} aria-hidden />} />
            </li>
            <li>
              <LinkRodape rotulo="Linktree" href={REDES_SOCIAIS.linktree} externo icone={<LinktreeLogo size={20} aria-hidden />} />
            </li>
          </ul>
          {/* Scarlett não tem acentos: só frase curta sem acento. */}
          <p className={css({ mt: "6", fontFamily: "marca", fontSize: "2xl", lineHeight: "snug", color: "superficie" })}>Cada detalhe, bem cuidado</p>
        </ColunaRodape>
      </nav>

      <div className={linhaLegal}>
        <div>
          <p className={css({ fontSize: "sm", lineHeight: "texto" })}>
            © {await anoAtual()} {EMPRESA.razaoSocial} · <span className={css({ whiteSpace: "nowrap" })}>CNPJ {EMPRESA.cnpj}</span>
          </p>
          <p className={css({ mt: "1", fontSize: "xs", lineHeight: "texto", color: "textoSobreRodape" })}>{EMPRESA.endereco}</p>
        </div>
        <ul className={css({ display: "flex", flexShrink: "0", gap: "4" })}>
          {LEGAIS.map((link) => (
            <li key={link.href}>
              <LinkRodape {...link} />
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}

function LinkRodape({ rotulo, href, externo, icone, children }: LinkRodape & { icone?: ReactNode; children?: ReactNode }) {
  const conteudo = (
    <>
      {icone}
      <span className={rotuloLink}>{children ?? rotulo}</span>
    </>
  );
  if (externo || href.startsWith("mailto:")) {
    return (
      <a href={href} className={link} {...(externo ? { target: "_blank", rel: "noopener", "aria-label": `${rotulo} (abre em nova aba)` } : {})}>
        {conteudo}
      </a>
    );
  }
  return (
    <Link href={href} className={link}>
      {conteudo}
    </Link>
  );
}

const rodape = css({ mt: "auto", bg: "fundoRodape", color: "superficie" });

// Laterais 12 / 20 / 40 (§3.0). Desktop: 6 × 210 + 5 × 20 = 1360 em 1440; abaixo disso as colunas
// encolhem por igual (minmax) em vez de vazar.
const menu = css({
  display: "grid",
  gridTemplateColumns: {
    base: "[minmax(0, 1fr)]",
    md: "[repeat(3, minmax(0, 1fr))]",
    desktop: "[repeat(6, minmax(0, token(sizes.colunaRodape)))]",
  },
  columnGap: "5",
  rowGap: { base: "0", md: "10" },
  mt: "8",
  // Celular: margem (e não padding) de 12, para as divisórias dos acordeões pararem na margem.
  mx: { base: "3", md: "0" },
  px: { base: "0", md: "5", desktop: "10" },
  borderTopWidth: { base: "1px", md: "0" },
  borderColor: "divisoriaSobreEscuro",
});

const lista = css({ display: "grid", gap: "2", justifyItems: "start" });

const link = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "2",
  maxW: "full",
  fontSize: "sm",
  fontWeight: "normal",
  lineHeight: "texto",
  color: "superficie",
  overflowWrap: "break-word",
  borderRadius: "xs",
  _focusVisible: { outline: "[2px solid]", outlineColor: "superficie", outlineOffset: "[2px]" },
});

// Sublinhado: ::after de 1 px na base do texto; só a opacidade anima (300 ms, como no cabeçalho).
const rotuloLink = css({
  position: "relative",
  _after: {
    content: '""',
    position: "absolute",
    left: "0",
    right: "0",
    bottom: "0",
    h: "[1px]",
    bg: "currentColor",
    opacity: "0",
    transitionProperty: "opacity",
    transitionDuration: "sublinhado",
    transitionTimingFunction: "assinatura",
  },
  "a:hover > &": { _after: { opacity: "1" } },
  "a:focus-visible > &": { _after: { opacity: "1" } },
});

const linhaLegal = css({
  display: "flex",
  flexDirection: { base: "column", md: "row" },
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: { base: "4", md: "6" },
  px: { base: "3", md: "5", desktop: "10" },
  pt: { base: "10", md: "16" },
  // Celular: 40 + a altura da doca flutuante de atalhos (24 + 43), para ela não cobrir "Termos".
  pb: { base: "[calc(112px + env(safe-area-inset-bottom))]", md: "16" },
});
