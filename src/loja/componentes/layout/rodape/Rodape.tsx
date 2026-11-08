import Link from "next/link";
import type { ReactNode } from "react";
import { css, cx } from "styled-system/css";
import { ArrowUp, CreditCard, EnvelopeSimple, InstagramLogo, LinktreeLogo, Needle, PixLogo, WhatsappLogo } from "@/loja/componentes/icones";
import { LINKS_UTILITARIOS } from "@/loja/componentes/layout/cabecalho/navegacao";
import { pespontoTopoEscuro } from "@/loja/estilos/pesponto";
import { DESCONTO_PIX_PERCENTUAL, MAX_PARCELAS } from "@/loja/lib/carrinho/totais";
import { EMPRESA, REDES_SOCIAIS } from "@/loja/lib/empresa";
import { ColunaRodape } from "./ColunaRodape";
import { VoltarAoTopo } from "./VoltarAoTopo";

type LinkRodape = { rotulo: string; href: string; externo?: boolean };

const WHATSAPP = `https://wa.me/${EMPRESA.whatsapp.numero}?text=${encodeURIComponent("Oi! Vim pela loja do ateliê.")}`;

// Só páginas que existem (o teste de links do rodapé abre cada uma).
const COLUNAS: Array<{ titulo: string; links: LinkRodape[] }> = [
  {
    titulo: "Comprar",
    links: [
      LINKS_UTILITARIOS.loja,
      LINKS_UTILITARIOS.edicao,
      { rotulo: "Projetos de quartinho", href: "/projetos" },
      { rotulo: "Monte o seu quartinho", href: "/projetos/monte-o-seu" },
    ],
  },
  {
    titulo: "Ajuda",
    links: [
      { rotulo: "Central de ajuda", href: "/ajuda" },
      { rotulo: "Como fazer o pedido", href: "/ajuda/como-fazer-pedido" },
      { rotulo: "Entregas", href: "/ajuda/entregas" },
      { rotulo: "Trocas e devoluções", href: "/ajuda/trocas-e-devolucoes" },
      { rotulo: "Bordado personalizado", href: "/ajuda/bordado-personalizado" },
      { rotulo: "Tecidos e cuidados", href: "/ajuda/tecidos-e-cuidados" },
      { rotulo: "Perguntas frequentes", href: "/ajuda/perguntas-frequentes" },
    ],
  },
  {
    titulo: "Minha conta",
    links: [LINKS_UTILITARIOS.conta, LINKS_UTILITARIOS.pedido, { rotulo: "Favoritos", href: "/conta/favoritos" }],
  },
  {
    titulo: "O ateliê",
    links: [{ rotulo: "Nossa história", href: "/sobre" }, LINKS_UTILITARIOS.indique],
  },
  {
    titulo: "Políticas",
    links: [
      { rotulo: "Todas as políticas", href: "/politicas" },
      { rotulo: "Privacidade", href: "/politicas/privacidade" },
      { rotulo: "Termos de uso", href: "/politicas/termos" },
      { rotulo: "Cookies", href: "/politicas/cookies" },
      { rotulo: "Política de trocas", href: "/politicas/trocas" },
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

// Rodapé da loja, em três faixas sobre o fundo escuro e quente, separadas por pesponto (a linha
// tracejada de costura):
// 1. Destaques: "Indique o ateliê" (o ponto forte do ateliê), o atendimento (WhatsApp com botão,
//    e-mail, horário e cidade) e "Feito à mão em Fortaleza", com as formas de pagamento só como
//    informação (o pagamento é combinado com a vendedora; não há checkout de pagamento no site).
// 2. Menu: 6 colunas de 210 px com vão de 20 no desktop, 3 no tablet e acordeões de 64 px no celular
//    (ColunaRodape). As redes sociais ficam abertas no celular.
// 3. Linha legal: razão social, CNPJ e endereço (Decreto 7.962/2013), Privacidade, Termos e "Voltar ao topo".
// Sem newsletter (não há envio de e-mails da loja) e sem selos de segurança.
// Server Component: só os acordeões e o "Voltar ao topo" rodam no navegador.
export async function Rodape() {
  return (
    <footer className={rodape}>
      <div className={destaques}>
        <section aria-labelledby="rodape-indique" className={blocoDestaque}>
          <h2 id="rodape-indique" className={tituloDestaque}>
            {LINKS_UTILITARIOS.indique.rotulo}
          </h2>
          <p className={textoDestaque}>
            A indicação de quem já recebeu uma peça é o que faz o ateliê crescer. Mande o link para quem está montando o enxoval.
          </p>
          <Link href={LINKS_UTILITARIOS.indique.href} className={botaoClaro}>
            Indicar o ateliê
          </Link>
        </section>

        <section aria-labelledby="rodape-atendimento" className={blocoDestaque}>
          <h2 id="rodape-atendimento" className={tituloDestaque}>
            Atendimento
          </h2>
          <p className={textoDestaque}>
            Uma vendedora do ateliê atende pelo WhatsApp: tira dúvidas, fecha o pedido e combina a entrega.
          </p>
          <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className={botaoClaro}>
            <WhatsappLogo size={18} aria-hidden /> {EMPRESA.whatsapp.exibicao}
            <span className={css({ srOnly: true })}> no WhatsApp (abre em nova aba)</span>
          </a>
          <ul className={cx(lista, css({ mt: "5" }))}>
            <li>
              {/* Quebra depois do "@" quando a coluna estreita não comporta o endereço inteiro. */}
              <LinkRodape rotulo={EMPRESA.emailAtendimento} href={`mailto:${EMPRESA.emailAtendimento}`} icone={<EnvelopeSimple size={18} aria-hidden />}>
                {EMPRESA.emailAtendimento.split("@")[0]}@<wbr />
                {EMPRESA.emailAtendimento.split("@")[1]}
              </LinkRodape>
            </li>
            <li className={informacao}>{EMPRESA.horarioAtendimento}</li>
          </ul>
        </section>

        <section aria-labelledby="rodape-feito-a-mao" className={blocoDestaque}>
          <h2 id="rodape-feito-a-mao" className={tituloDestaque}>
            <Needle size={20} aria-hidden className={css({ flexShrink: "0" })} />
            Feito à mão em {EMPRESA.cidade}
          </h2>
          <p className={textoDestaque}>
            Ateliê em {EMPRESA.cidade}/{EMPRESA.uf} · {EMPRESA.entrega}.
          </p>
          <p className={cx(informacao, css({ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: "2", rowGap: "1", mt: "4" }))}>
            <PixLogo size={16} aria-hidden /> {DESCONTO_PIX_PERCENTUAL}% OFF no Pix
            <span aria-hidden>·</span>
            <CreditCard size={16} aria-hidden /> até {MAX_PARCELAS}x no cartão
            <span aria-hidden>·</span>
            <span>combinado pelo WhatsApp</span>
          </p>
        </section>
      </div>

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

        {/* No celular, o grupo de redes fica aberto. */}
        <ColunaRodape titulo="Redes sociais" abertoInicial>
          <ul className={lista}>
            <li>
              <LinkRodape rotulo="Instagram" href={REDES_SOCIAIS.instagram} externo icone={<InstagramLogo size={20} aria-hidden />} />
            </li>
            <li>
              <LinkRodape rotulo="Linktree" href={REDES_SOCIAIS.linktree} externo icone={<LinktreeLogo size={20} aria-hidden />} />
            </li>
          </ul>
        </ColunaRodape>
      </nav>

      <div className={cx(linhaLegal, pespontoTopoEscuro)}>
        <div>
          <p className={css({ fontSize: "sm", lineHeight: "texto" })}>
            © {await anoAtual()} {EMPRESA.razaoSocial} · <span className={css({ whiteSpace: "nowrap" })}>CNPJ {EMPRESA.cnpj}</span>
          </p>
          <p className={css({ mt: "1", fontSize: "xs", lineHeight: "texto", color: "textoSobreRodape" })}>{EMPRESA.endereco}</p>
        </div>
        <div className={css({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4", flexShrink: "0" })}>
          <ul className={css({ display: "flex", gap: "4" })}>
            {LEGAIS.map((link) => (
              <li key={link.href}>
                <LinkRodape {...link} />
              </li>
            ))}
          </ul>
          <VoltarAoTopo className={botaoTopo}>
            <ArrowUp size={16} aria-hidden /> Voltar ao topo
          </VoltarAoTopo>
        </div>
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
      <a href={href} className={link} {...(externo ? { target: "_blank", rel: "noopener noreferrer", "aria-label": `${rotulo} (abre em nova aba)` } : {})}>
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

// Faixa de destaques: 3 blocos lado a lado a partir de 992 (empilhados antes), com pesponto embaixo.
// Laterais 12 / 20 / 40, como o menu.
const destaques = css({
  display: "grid",
  gridTemplateColumns: { base: "[minmax(0, 1fr)]", md: "[repeat(2, minmax(0, 1fr))]", desktop: "[repeat(3, minmax(0, 1fr))]" },
  columnGap: { md: "8", desktop: "10" },
  rowGap: { base: "10", md: "12" },
  mx: { base: "3", md: "5", desktop: "10" },
  pt: { base: "12", desktop: "16" },
  pb: { base: "12", desktop: "14" },
});

const blocoDestaque = css({ display: "flex", flexDirection: "column", alignItems: "flex-start", minW: "0", maxW: "[420px]" });

const tituloDestaque = css({
  display: "flex",
  alignItems: "center",
  gap: "2",
  fontSize: { base: "xl", desktop: "2xl" },
  fontWeight: "normal",
  lineHeight: "subtitulo",
  color: "superficie",
});

const textoDestaque = css({ mt: "3", fontSize: "sm", lineHeight: "texto", color: "textoSobreRodape" });

const informacao = css({ fontSize: "sm", lineHeight: "texto", color: "textoSobreRodape" });

// Botão claro em pílula (44 de altura), o único botão "cheio" do rodapé.
const botaoClaro = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "2",
  minH: "11",
  mt: "5",
  px: "5",
  borderRadius: "pilula",
  bg: "superficie",
  color: "escuro",
  fontSize: "sm",
  fontWeight: "medium",
  lineHeight: "none",
  whiteSpace: "nowrap",
  transitionProperty: "background-color",
  transitionDuration: "normal",
  transitionTimingFunction: "assinatura",
  _hover: { bg: "marcaSuave" },
  _focusVisible: { outline: "[2px solid]", outlineColor: "superficie", outlineOffset: "[2px]" },
});

// Laterais 12 / 20 / 40. Desktop: 6 × 210 + 5 × 20 = 1360 em 1440; abaixo disso as colunas
// encolhem por igual (minmax) em vez de vazar. Pesponto em cima (fim da faixa de destaques).
const menu = cx(
  css({
    display: "grid",
    gridTemplateColumns: {
      base: "[minmax(0, 1fr)]",
      md: "[repeat(3, minmax(0, 1fr))]",
      desktop: "[repeat(6, minmax(0, token(sizes.colunaRodape)))]",
    },
    columnGap: "5",
    rowGap: { base: "0", md: "10" },
    // Celular: margem (e não padding) de 12, para as divisórias dos acordeões pararem na margem.
    mx: { base: "3", md: "5", desktop: "10" },
    pt: { base: "0", md: "10" },
  }),
  pespontoTopoEscuro,
);

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
  minW: "0",
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
  alignItems: { base: "flex-start", md: "center" },
  gap: { base: "4", md: "6" },
  mt: { base: "0", md: "16" },
  mx: { base: "3", md: "5", desktop: "10" },
  pt: { base: "8", md: "10" },
  // Celular: 40 + a altura da doca flutuante de atalhos (24 + 43), para ela não cobrir "Termos".
  pb: { base: "[calc(112px + env(safe-area-inset-bottom))]", md: "12" },
});

const botaoTopo = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "2",
  minH: "10",
  px: "4",
  borderRadius: "pilula",
  borderWidth: "1px",
  borderColor: "divisoriaSobreEscuro",
  fontSize: "sm",
  lineHeight: "none",
  color: "superficie",
  cursor: "pointer",
  transitionProperty: "border-color",
  transitionDuration: "normal",
  _hover: { borderColor: "superficie" },
  _focusVisible: { outline: "[2px solid]", outlineColor: "superficie", outlineOffset: "[2px]" },
});
