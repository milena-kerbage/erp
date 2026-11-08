import type { Metadata } from "next";
import Link from "next/link";
import { css, cx } from "styled-system/css";
import { botaoContorno, botaoEscuro } from "@/loja/componentes/carrinho/estilos";
import { InstagramLogo } from "@/loja/componentes/icones";
import { caixaDestaque, prosa, tituloSecao } from "@/loja/componentes/institucional/estilos";
import { PaginaInstitucional } from "@/loja/componentes/institucional/PaginaInstitucional";
import { JsonLd } from "@/loja/componentes/seo/JsonLd";
import { DIFERENCIAIS, ETAPAS } from "@/loja/lib/casas/catalogo";
import { EMPRESA, REDES_SOCIAIS } from "@/loja/lib/empresa";
import { ORIGEM } from "@/loja/lib/seo/config";
import { metadataPagina } from "@/loja/lib/seo/institucional";

const CAMINHO = "/sobre";

export const metadata: Metadata = metadataPagina({
  titulo: "Nossa história",
  descricao:
    "Conheça o Ateliê Milena Kerbage: enxoval e quarto de bebê feitos à mão em Fortaleza, do kit berço ao projeto de quartinho completo, com entrega para todo o Brasil.",
  caminho: CAMINHO,
  indexar: true,
});

// "Nossa história" sem fatos inventados: só o que o ateliê já publica (Fortaleza, feito à mão,
// enxoval e quarto de bebê, entrega para todo o Brasil, atendimento pelo WhatsApp, projetos e a
// força da indicação). [CONFIRMAR] com a Milena antes de enriquecer: ano de fundação, como o ateliê
// começou, equipe, fotos do ateliê e depoimentos de clientes (com autorização).
export default function Sobre() {
  return (
    <>
      <JsonLd
        dados={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          url: `${ORIGEM}${CAMINHO}`,
          name: "Nossa história",
          about: {
            "@type": "Organization",
            name: EMPRESA.nomeFantasia,
            legalName: EMPRESA.razaoSocial,
            url: ORIGEM,
            sameAs: [REDES_SOCIAIS.instagram],
            address: { "@type": "PostalAddress", addressLocality: EMPRESA.cidade, addressRegion: EMPRESA.uf, addressCountry: "BR" },
          },
        }}
      />
      <PaginaInstitucional
        trilha={[{ rotulo: "Nossa história", href: CAMINHO }]}
        titulo="Nossa história"
        abertura={`O ${EMPRESA.nomeFantasia} faz enxoval e quarto de bebê à mão, em ${EMPRESA.cidade}, para famílias de todo o Brasil.`}
      >
        <div className={duasColunas}>
          <div className={prosa}>
            <h2 id="feito-a-mao">Feito à mão, peça por peça</h2>
            <p>
              No ateliê, em {EMPRESA.cidade}/{EMPRESA.uf}, cada peça é cortada, costurada e bordada à mão, com conferência de cada detalhe
              antes de sair. Trabalhamos com tecidos naturais, como linho, tricoline e percal de algodão, macios e próprios para a pele do
              bebê.
            </p>
            <h2 id="do-enxoval-ao-quartinho">Do enxoval ao quartinho</h2>
            <p>
              Fazemos o kit berço, os paninhos, as toalhas e as mantas do enxoval, as peças do quarto e da maternidade. Algumas ficam
              prontas para envio, a <Link href="/pronta-entrega">pronta entrega</Link>; outras são feitas sob encomenda, com o bordado do
              nome do bebê. E, para quem quer o quarto inteiro no mesmo tema, criamos{" "}
              <Link href="/projetos">projetos de quartinho</Link> completos.
            </p>
          </div>
          <p aria-hidden className={frase}>
            Cada detalhe, bem cuidado
          </p>
        </div>

        <section aria-labelledby="titulo-diferenciais" className={css({ mt: { base: "16", desktop: "24" } })}>
          <h2 id="titulo-diferenciais" className={tituloSecao}>
            O que guia o nosso trabalho
          </h2>
          <ul className={gradeTres}>
            {DIFERENCIAIS.map((item) => (
              <li key={item.titulo} className={css({ borderTopWidth: "1px", borderColor: "escuro", pt: "4" })}>
                <h3 className={css({ fontSize: "lg", fontWeight: "medium", color: "escuro" })}>{item.titulo}</h3>
                <p className={css({ mt: "2", fontSize: "md", lineHeight: "relaxed", color: "texto" })}>{item.texto}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="titulo-processo" className={css({ mt: { base: "16", desktop: "24" } })}>
          <h2 id="titulo-processo" className={tituloSecao}>
            Como nasce um quartinho
          </h2>
          <p className={css({ mt: "3", maxW: "leitura", fontSize: { base: "md", md: "lg" }, lineHeight: "relaxed", color: "textoSuave" })}>
            Da primeira conversa à entrega, cada projeto é acompanhado de perto por uma vendedora do ateliê.
          </p>
          <ol className={gradeTres}>
            {ETAPAS.map((etapa, indice) => (
              <li key={etapa.titulo} className={css({ borderTopWidth: "1px", borderColor: "escuro", pt: "4" })}>
                <p className={css({ fontSize: "sm", color: "textoSuave" })}>{String(indice + 1).padStart(2, "0")}</p>
                <h3 className={css({ mt: "1", fontSize: "lg", fontWeight: "medium", color: "escuro" })}>{etapa.titulo}</h3>
                <p className={css({ mt: "2", fontSize: "md", lineHeight: "relaxed", color: "texto" })}>{etapa.texto}</p>
              </li>
            ))}
          </ol>
          <Link href="/projetos/como-funciona" className={cx(botaoContorno, css({ mt: "8" }))}>
            Ver como funciona um projeto
          </Link>
        </section>

        <section aria-labelledby="titulo-indicacao" className={cx(caixaDestaque, css({ mt: { base: "16", desktop: "24" } }))}>
          <h2 id="titulo-indicacao" className={tituloSecao}>
            De cliente para cliente
          </h2>
          <p className={css({ mt: "3", maxW: "leitura", fontSize: { base: "md", md: "lg" }, lineHeight: "relaxed" })}>
            Muitas famílias chegam ao ateliê por indicação: uma mãe que mostra o quartinho para a amiga, uma avó que presenteia a
            próxima neta. Se você gostou do nosso trabalho, contar para alguém é o maior carinho que pode fazer por nós.
          </p>
          <div className={css({ display: "flex", flexWrap: "wrap", gap: "3", mt: "6" })}>
            <Link href="/indique" className={botaoEscuro}>
              Indique o ateliê
            </Link>
            <a href={REDES_SOCIAIS.instagram} target="_blank" rel="noopener noreferrer" className={botaoContorno}>
              <InstagramLogo size={18} aria-hidden /> Siga no Instagram
              <span className={css({ srOnly: true })}> (abre em nova aba)</span>
            </a>
          </div>
        </section>

        <section aria-labelledby="titulo-atendimento" className={css({ mt: { base: "16", desktop: "24" } })}>
          <div className={prosa}>
            <h2 id="titulo-atendimento">Atendimento de perto</h2>
            <p>
              Você escolhe as peças no site e uma vendedora do ateliê continua com você pelo WhatsApp, {EMPRESA.whatsapp.exibicao}: confirma
              valores, bordado, frete e prazo e acompanha o pedido até a entrega, para qualquer cidade do Brasil, ou a retirada no ateliê.
              Saiba <Link href="/ajuda/como-fazer-pedido">como fazer seu pedido</Link>.
            </p>
          </div>
        </section>
      </PaginaInstitucional>
    </>
  );
}

const duasColunas = css({
  display: "grid",
  gridTemplateColumns: { base: "minmax(0, 1fr)", desktop: "[minmax(0, 720px) minmax(0, 1fr)]" },
  gap: { base: "10", desktop: "16" },
  alignItems: "center",
});

const frase = css({
  display: { base: "none", desktop: "block" },
  fontFamily: "marca",
  fontSize: "secao",
  lineHeight: "titulo",
  color: "logo",
  textAlign: "center",
});

const gradeTres = css({
  display: "grid",
  gridTemplateColumns: { base: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))", desktop: "repeat(3, minmax(0, 1fr))" },
  gap: { base: "8", md: "10" },
  mt: "8",
});
