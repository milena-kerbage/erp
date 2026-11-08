import type { Metadata } from "next";
import Link from "next/link";
import { css, cx } from "styled-system/css";
import { BotoesIndicacao } from "@/loja/componentes/institucional/BotoesIndicacao";
import { caixaDestaque, prosa, tituloSecao } from "@/loja/componentes/institucional/estilos";
import { BlocoContato, PaginaInstitucional } from "@/loja/componentes/institucional/PaginaInstitucional";
import { ORIGEM } from "@/loja/lib/seo/config";
import { metadataPagina } from "@/loja/lib/seo/institucional";

const CAMINHO = "/indique";

export const metadata: Metadata = metadataPagina({
  titulo: "Indique o ateliê",
  descricao:
    "Gostou do Ateliê Milena Kerbage? Indique para quem está esperando um bebê: mande o link da loja pelo WhatsApp com uma mensagem pronta ou copie o link.",
  caminho: CAMINHO,
  indexar: true,
});

// A indicação é o ponto forte do ateliê. Página simples: por que indicar, como e os botões de
// compartilhar (WhatsApp com mensagem pronta e copiar link, lib/indicacao.ts). Sem programa de pontos
// nem recompensa automática. [CONFIRMAR] com o ateliê se haverá algum agradecimento a quem indica
// (hoje a página não promete nada).
export default function Indique() {
  return (
    <PaginaInstitucional
      trilha={[{ rotulo: "Indique o ateliê", href: CAMINHO }]}
      titulo="Indique o ateliê"
      abertura="Muitas famílias chegam até nós por indicação. Conhece alguém esperando um bebê? Mande o link da loja em um toque."
    >
      <section aria-labelledby="titulo-compartilhar" className={caixaDestaque}>
        <h2 id="titulo-compartilhar" className={tituloSecao}>
          Compartilhe a loja
        </h2>
        <p className={css({ mt: "3", mb: "6", maxW: "leitura", fontSize: { base: "md", md: "lg" }, lineHeight: "relaxed" })}>
          O WhatsApp abre com uma mensagem pronta e o link da loja. É só escolher para quem enviar.
        </p>
        <BotoesIndicacao origem={ORIGEM} />
      </section>

      <div className={cx(prosa, css({ mt: { base: "14", desktop: "20" } }))}>
        <h2 id="como-funciona">Como funciona</h2>
        <ol>
          <li>Você manda o link da loja para uma amiga, uma irmã ou quem estiver montando o enxoval.</li>
          <li>Ela conhece as peças, monta a sacola e faz o pedido pelo WhatsApp, com uma vendedora do ateliê.</li>
          <li>Se quiser, ela pode contar na conversa que chegou por indicação sua: a gente adora saber como cada família nos conheceu.</li>
        </ol>
        <p>Não tem cadastro, código nem programa de pontos: indicar é só compartilhar.</p>

        <h2 id="o-que-indicar">O que dá para indicar</h2>
        <ul>
          <li>
            As peças a <Link href="/pronta-entrega">pronta entrega</Link>, para quem precisa de algo logo.
          </li>
          <li>
            Os <Link href="/projetos">projetos de quartinho</Link>, para quem quer o quarto inteiro no mesmo tema.
          </li>
          <li>
            Uma peça específica: na página do produto, copie o endereço do navegador e mande junto.
          </li>
        </ul>
      </div>

      <BlocoContato titulo="Quer indicar e tirar uma dúvida antes?" texto="Fale com uma vendedora do ateliê pelo WhatsApp." />
    </PaginaInstitucional>
  );
}
