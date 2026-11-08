import Link from "next/link";
import type { ReactNode } from "react";
import { css, cx } from "styled-system/css";
import { botaoContorno, botaoEscuro } from "@/loja/componentes/carrinho/estilos";
import { WhatsappLogo } from "@/loja/componentes/icones";
import { JsonLd } from "@/loja/componentes/seo/JsonLd";
import { EMPRESA } from "@/loja/lib/empresa";
import { type Elo, schemaTrilha } from "@/loja/lib/seo/institucional";
import { caixaDestaque, lead, margens, tituloInstitucional, tituloSecao } from "./estilos";

// Molde das páginas institucionais: trilha (com BreadcrumbList), título, linha de abertura e o corpo.
// Com `lateral`, o desktop ganha a coluna de navegação da seção (temas de ajuda, políticas) à
// esquerda; no celular e no tablet ela desce para depois do conteúdo, como "Outros temas".
export function PaginaInstitucional({
  trilha,
  titulo,
  abertura,
  lateral,
  children,
}: {
  trilha: Elo[]; // sem a Página inicial; o último elo é a própria página
  titulo: string;
  abertura?: ReactNode;
  lateral?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <JsonLd dados={schemaTrilha(trilha)} />
      <div className={cx(margens, css({ pb: { base: "16", desktop: "24" } }))}>
        <TrilhaNavegacao elos={trilha} />
        <header>
          <h1 className={tituloInstitucional}>{titulo}</h1>
          {abertura && <div className={lead}>{abertura}</div>}
        </header>
        <div className={lateral ? comLateral : css({ mt: { base: "10", desktop: "14" } })}>
          <div className={css({ minW: "0", gridArea: "conteudo" })}>{children}</div>
          {lateral && <div className={css({ minW: "0", gridArea: "lateral" })}>{lateral}</div>}
        </div>
      </div>
    </>
  );
}

const comLateral = css({
  display: "grid",
  gridTemplateAreas: { base: '"conteudo" "lateral"', desktop: '"lateral conteudo"' },
  gridTemplateColumns: { base: "minmax(0, 1fr)", desktop: "[240px minmax(0, 1fr)]" },
  columnGap: { desktop: "16" },
  rowGap: "16",
  mt: { base: "10", desktop: "14" },
  // No desktop a célula da lateral estica até a altura do conteúdo: é o espaço que a navegação
  // (sticky em NavSecao) precisa para acompanhar a rolagem. Com "start", a célula tinha só a altura
  // do menu e o sticky não tinha por onde deslizar.
  alignItems: { base: "start", desktop: "stretch" },
});

// Trilha de 14 (como o topo da listagem): "Página inicial / Ajuda / Entregas", o último marcado.
export function TrilhaNavegacao({ elos }: { elos: Elo[] }) {
  const todos = [{ rotulo: "Página inicial", href: "/" }, ...elos];
  return (
    <nav aria-label="Você está em" className={css({ pt: "5" })}>
      <ol className={css({ display: "flex", flexWrap: "wrap", gap: "1", fontSize: "sm", lineHeight: "texto", color: "escuro" })}>
        {todos.map((elo, indice) => {
          const atual = indice === todos.length - 1;
          return (
            <li key={elo.href} className={css({ display: "flex", gap: "1", minW: "0" })}>
              {indice > 0 && <span aria-hidden>/</span>}
              <Link
                href={elo.href}
                aria-current={atual ? "page" : undefined}
                className={css({
                  _hover: { textDecoration: "underline", textUnderlineOffset: "[4px]" },
                  "&[aria-current=page]": { color: "textoSuave" },
                })}
              >
                {elo.rotulo}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Navegação da seção (lateral): título pequeno e links de 16, o atual em negrito com traço à esquerda.
export function NavSecao({ titulo, links, atual }: { titulo: string; links: Elo[]; atual?: string }) {
  return (
    <nav aria-label={titulo} className={css({ position: { desktop: "sticky" }, top: "[96px]" })}>
      <p className={css({ fontSize: "sm", fontWeight: "medium", color: "textoSuave" })}>{titulo}</p>
      <ul className={css({ display: "grid", gap: "1", mt: "3", borderLeftWidth: "1px", borderColor: "borda" })}>
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} aria-current={link.href === atual ? "page" : undefined} className={linkSecao}>
              {link.rotulo}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

const linkSecao = css({
  display: "block",
  py: "2",
  pl: "4",
  ml: "[-1px]",
  borderLeftWidth: "2px",
  borderColor: "transparent",
  fontSize: "md",
  lineHeight: "texto",
  color: "texto",
  _hover: { color: "escuro", textDecoration: "underline", textUnderlineOffset: "[4px]" },
  "&[aria-current=page]": { borderColor: "escuro", color: "escuro", fontWeight: "medium" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco", borderRadius: "xs" },
});

// "Ainda precisa de ajuda?": WhatsApp de vendas e e-mail, no fim das páginas de ajuda e políticas.
export function BlocoContato({ titulo = "Ainda precisa de ajuda?", texto }: { titulo?: string; texto?: ReactNode }) {
  return (
    <section aria-labelledby="titulo-contato" className={cx(caixaDestaque, css({ mt: { base: "16", desktop: "20" } }))}>
      <h2 id="titulo-contato" className={tituloSecao}>
        {titulo}
      </h2>
      <p className={css({ mt: "3", maxW: "leitura", fontSize: { base: "md", md: "lg" }, lineHeight: "relaxed" })}>
        {texto ?? "Fale com uma vendedora do ateliê pelo WhatsApp. Respondemos em horário comercial."}
      </p>
      <div className={css({ display: "flex", flexWrap: "wrap", gap: "3", mt: "6" })}>
        <a href={`https://wa.me/${EMPRESA.whatsapp.numero}`} target="_blank" rel="noopener noreferrer" className={botaoEscuro}>
          <WhatsappLogo size={18} aria-hidden /> WhatsApp {EMPRESA.whatsapp.exibicao}
          <span className={css({ srOnly: true })}> (abre em nova aba)</span>
        </a>
        <a href={`mailto:${EMPRESA.emailAtendimento}`} className={cx(botaoContorno, css({ whiteSpace: "normal", overflowWrap: "anywhere" }))}>
          {EMPRESA.emailAtendimento}
        </a>
      </div>
    </section>
  );
}
