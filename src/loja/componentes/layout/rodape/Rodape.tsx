import Image from "next/image";
import Link from "next/link";
import { css } from "styled-system/css";
import { ArrowRight, ArrowUp, ArrowUpRight, WhatsappLogo } from "@/loja/componentes/icones";
import { LINKS_UTILITARIOS } from "@/loja/componentes/layout/cabecalho/navegacao";
import { DESCONTO_PIX_PERCENTUAL } from "@/loja/lib/carrinho/totais";
import { EMPRESA, REDES_SOCIAIS } from "@/loja/lib/empresa";
import { VoltarAoTopo } from "./VoltarAoTopo";

type LinkRodape = { rotulo: string; href: string };

const WHATSAPP = `https://wa.me/${EMPRESA.whatsapp.numero}?text=${encodeURIComponent("Oi! Vim pela loja do ateliê.")}`;

// Atalhos em duas colunas (só páginas que existem).
const ATALHOS: LinkRodape[] = [
  { rotulo: "Kit berço", href: "/kit-berco" },
  { rotulo: "Personalizado", href: "/personalizado" },
  { rotulo: "Enxoval", href: "/enxoval" },
  { rotulo: "Pronta entrega", href: LINKS_UTILITARIOS.loja.href },
  { rotulo: "Quarto de bebê", href: "/quarto" },
  { rotulo: "Ajuda", href: "/ajuda" },
  { rotulo: "Maternidade", href: "/maternidade" },
  { rotulo: "Minha conta", href: LINKS_UTILITARIOS.conta.href },
  { rotulo: "Nossa história", href: "/sobre" },
  { rotulo: LINKS_UTILITARIOS.indique.rotulo, href: LINKS_UTILITARIOS.indique.href },
];

const REDES = [
  { rotulo: "Instagram", href: REDES_SOCIAIS.instagram },
  { rotulo: "Linktree", href: REDES_SOCIAIS.linktree },
  { rotulo: "WhatsApp", href: WHATSAPP },
];

const LEGAIS: LinkRodape[] = [
  { rotulo: "Cookies", href: "/politicas/cookies" },
  { rotulo: "Privacidade", href: "/politicas/privacidade" },
  { rotulo: "Termos", href: "/politicas/termos" },
];

// Ano do rodapé (a loja não usa Cache Components, que exigiria Suspense nas páginas do ERP).
async function anoAtual(): Promise<number> {
  return new Date().getFullYear();
}

// Rodapé minimalista: um cartão verde-sálvia profundo com cantos grandes no topo. No centro, o símbolo
// num medalhão sobreposto à borda, a assinatura da
// marca, a frase em Scarlett (sem acento) e os dois convites principais. Embaixo, contato e redes à
// esquerda, atalhos em duas colunas à direita e, na base, os informativos e a linha legal (razão
// social, CNPJ e endereço: Decreto 7.962/2013). Server Component; só o "Voltar ao topo" roda no navegador.
export async function Rodape() {
  return (
    <footer className={rodape}>
      <div className={cartao}>
        <span aria-hidden className={medalhao}>
          <Image src="/vitrine/marca/simbolo-green.svg" alt="" width={64} height={72} className={simbolo} />
        </span>

        <div className={centro}>
          <Link href="/" aria-label={`${EMPRESA.nomeFantasia}, página inicial`} className={linkMarca}>
            <Image src="/vitrine/marca/assinatura-white.svg" alt="" width={360} height={73} className={assinatura} />
          </Link>
          <p className={frase}>Cada detalhe, bem cuidado</p>
          <div className={convites}>
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className={botaoClaro}>
              <WhatsappLogo size={18} aria-hidden />
              Fale com o ateliê
              <span className={setaCirculo}>
                <ArrowRight size={14} aria-hidden />
              </span>
              <span className={css({ srOnly: true })}> (abre o WhatsApp em nova aba)</span>
            </a>
            <Link href="/personalizado/monte-o-seu" className={botaoEscuro}>
              Monte o seu quartinho
              <span className={setaCirculoClaro}>
                <ArrowRight size={14} aria-hidden />
              </span>
            </Link>
          </div>
        </div>

        <div className={grade}>
          <section aria-labelledby="rodape-contato" className={css({ gridArea: "contato" })}>
            <h2 id="rodape-contato" className={tituloColuna}>
              Contato
            </h2>
            <address className={textoContato}>
              {EMPRESA.endereco}
              <br />
              <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className={linkSimples}>
                {EMPRESA.whatsapp.exibicao}
              </a>
              <br />
              <a href={`mailto:${EMPRESA.emailAtendimento}`} className={linkSublinhado}>
                {EMPRESA.emailAtendimento}
              </a>
            </address>
          </section>

          <nav aria-label="Redes sociais" className={css({ gridArea: "redes" })}>
            <ul className={listaRedes}>
              {REDES.map((rede) => (
                <li key={rede.rotulo}>
                  <a href={rede.href} target="_blank" rel="noopener noreferrer" className={linkRede}>
                    {rede.rotulo}
                    <ArrowUpRight size={14} aria-hidden className={css({ color: "marcaSuave" })} />
                    <span className={css({ srOnly: true })}> (abre em nova aba)</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="rodape-atalhos" className={css({ gridArea: "atalhos" })}>
            <h2 id="rodape-atalhos" className={tituloColuna}>
              Navegue
            </h2>
            <ul className={listaAtalhos}>
              {ATALHOS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={linkSimples}>
                    {link.rotulo}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className={base}>
          <div className={informativos}>
            <span className={selo}>{DESCONTO_PIX_PERCENTUAL}% OFF no Pix</span>
            <span className={textoBase}>Feito à mão em {EMPRESA.cidade}/{EMPRESA.uf} · Entrega para todo o Brasil</span>
            <span className={textoBase}>
              {EMPRESA.razaoSocial} · CNPJ {EMPRESA.cnpj}
            </span>
          </div>
          <div className={pilulaLegal}>
            <ul className={css({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4" })}>
              {LEGAIS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={linkLegal}>
                    {link.rotulo}
                  </Link>
                </li>
              ))}
            </ul>
            <span className={css({ color: "escuro" })}>
              © {await anoAtual()} {EMPRESA.nomeFantasia}
            </span>
            <VoltarAoTopo className={botaoTopo}>
              <ArrowUp size={14} aria-hidden />
              <span className={css({ srOnly: true })}>Voltar ao topo</span>
            </VoltarAoTopo>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Respiro acima do cartão para o símbolo sobreposto à borda.
const rodape = css({ mt: { base: "20", desktop: "28" }, px: { base: "0", md: "3" } });

const cartao = css({
  position: "relative",
  isolation: "isolate",
  bg: "fundoRodape",
  color: "textoSobreRodape",
  borderTopRadius: { base: "[28px]", md: "[48px]" },
  px: { base: "5", md: "10", desktop: "16" },
  pt: { base: "20", desktop: "28" },
  pb: { base: "6", desktop: "8" },
});

// Medalhão do símbolo, sobreposto à borda do cartão: círculo linho com contorno duplo fino (anel claro
// na cor da página e um fio sálvia por fora), para a marca não ficar "solta".
const medalhao = css({
  position: "absolute",
  top: "0",
  left: "[50%]",
  transform: "translate(-50%, -50%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  w: { base: "[96px]", desktop: "[124px]" },
  h: { base: "[96px]", desktop: "[124px]" },
  borderRadius: "full",
  bg: "fundo",
  borderWidth: "1px",
  borderColor: "[rgba(97, 109, 84, 0.35)]",
  boxShadow: "[0 0 0 8px token(colors.fundo), 0 0 0 9px rgba(97, 109, 84, 0.22), 0 12px 32px rgba(29, 31, 27, 0.12)]",
});

const simbolo = css({ w: { base: "[46px]", desktop: "[60px]" }, h: "auto" });

const centro = css({ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" });

const linkMarca = css({ display: "inline-flex", borderRadius: "md", _focusVisible: { outline: "none", boxShadow: "anelFoco" } });

const assinatura = css({ w: { base: "[240px]", desktop: "[360px]" }, h: "auto" });

const frase = css({ mt: "3", fontFamily: "marca", fontSize: { base: "xl", desktop: "2xl" }, color: "fundo" });

const convites = css({
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: "3",
  mt: { base: "8", desktop: "10" },
});

const baseBotao = {
  display: "inline-flex",
  alignItems: "center",
  gap: "2",
  minH: "11",
  pl: "5",
  pr: "1.5",
  borderRadius: "pilula",
  fontSize: "sm",
  fontWeight: "medium",
  whiteSpace: "nowrap",
  transitionProperty: "background-color, transform",
  transitionDuration: "normal",
  transitionTimingFunction: "assinatura",
  _hover: { transform: "translateY(-1px)" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
  "& svg": { flexShrink: "0" },
} as const;

const botaoClaro = css({ ...baseBotao, bg: "marcaSuave", color: "escuro", _hover: { ...baseBotao._hover, bg: "fundo" } });
const botaoEscuro = css({
  ...baseBotao,
  bg: "transparent",
  color: "fundo",
  borderWidth: "1px",
  borderColor: "[rgba(255, 255, 255, 0.28)]",
  _hover: { ...baseBotao._hover, bg: "[rgba(255, 255, 255, 0.08)]" },
});

const setaCirculo = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  w: "8",
  h: "8",
  ml: "1",
  borderRadius: "full",
  bg: "escuro",
  color: "fundo",
});
const setaCirculoClaro = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  w: "8",
  h: "8",
  ml: "1",
  borderRadius: "full",
  bg: "marcaSuave",
  color: "escuro",
});

// Celular: tudo empilhado. Desktop: contato | redes | (vão) | atalhos.
const grade = css({
  display: "grid",
  gridTemplateColumns: { base: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))", desktop: "[minmax(0, 3fr) minmax(0, 2fr) minmax(0, 3fr) minmax(0, 4fr)]" },
  gridTemplateAreas: {
    base: '"contato" "redes" "atalhos"',
    md: '"contato redes" "atalhos atalhos"',
    desktop: '"contato redes . atalhos"',
  },
  gap: { base: "8", desktop: "6" },
  alignItems: "end",
  mt: { base: "14", desktop: "16" },
});

const tituloColuna = css({ mb: "3", fontSize: { base: "xl", desktop: "2xl" }, fontWeight: "medium", color: "fundo", letterSpacing: "[-0.02em]" });

const textoContato = css({ fontStyle: "normal", fontSize: "sm", lineHeight: "relaxed" });

const linkSimples = css({
  fontSize: "sm",
  lineHeight: "relaxed",
  color: "textoSobreRodape",
  transitionProperty: "color",
  transitionDuration: "normal",
  _hover: { color: "fundo" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco", borderRadius: "xs" },
});
const linkSublinhado = css({ textDecoration: "underline", textUnderlineOffset: "3px", _hover: { color: "fundo" } });

const listaRedes = css({ display: "grid", gap: "2" });
const linkRede = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "2",
  fontSize: "sm",
  color: "textoSobreRodape",
  _hover: { color: "fundo" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco", borderRadius: "xs" },
});

const listaAtalhos = css({ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", columnGap: "8", rowGap: "1" });

const base = css({
  display: "flex",
  flexDirection: { base: "column", desktop: "row" },
  alignItems: { base: "flex-start", desktop: "flex-end" },
  justifyContent: "space-between",
  gap: "5",
  mt: { base: "12", desktop: "14" },
});

const informativos = css({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: { base: "2", desktop: "4" } });

const selo = css({
  display: "inline-flex",
  alignItems: "center",
  px: "2.5",
  py: "0.5",
  borderRadius: "pilula",
  bg: "marcaSuave",
  color: "escuro",
  fontSize: "xs",
  fontWeight: "medium",
});

const textoBase = css({ fontSize: "xs", color: "textoSobreRodape" });

const pilulaLegal = css({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "4",
  px: "4",
  py: "2",
  borderRadius: "md",
  bg: "fundo",
  fontSize: "xs",
  color: "escuro",
});

const linkLegal = css({ color: "escuro", _hover: { textDecoration: "underline", textUnderlineOffset: "3px" }, _focusVisible: { outline: "none", boxShadow: "anelFoco", borderRadius: "xs" } });

const botaoTopo = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  w: "7",
  h: "7",
  borderRadius: "full",
  bg: "escuro",
  color: "fundo",
  cursor: "pointer",
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});
