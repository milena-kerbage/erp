import { css } from "styled-system/css";
import { Acordeao } from "@/loja/componentes/institucional/Acordeao";
import { tituloSecao } from "@/loja/componentes/institucional/estilos";
import { BlocoContato, PaginaInstitucional } from "@/loja/componentes/institucional/PaginaInstitucional";
import { LateralAjuda, metadataTema, trilhaTema } from "@/loja/componentes/institucional/secoes";
import { JsonLd } from "@/loja/componentes/seo/JsonLd";
import { PERGUNTAS, TEMAS_AJUDA } from "@/loja/lib/ajuda/conteudo";
import { schemaPerguntas } from "@/loja/lib/seo/institucional";

const SLUG = "perguntas-frequentes";
export const metadata = metadataTema(SLUG);

// Todas as perguntas da central, agrupadas pelo tema, em acordeões (com FAQPage no JSON-LD). As de
// "perguntas-frequentes" (conta neste aparelho, indicação, projetos) ficam no grupo "Outras dúvidas".
export default function PerguntasFrequentes() {
  const grupos = TEMAS_AJUDA.map((tema) => ({
    tema,
    perguntas: PERGUNTAS.filter((pergunta) => pergunta.tema === tema.slug),
  })).filter((grupo) => grupo.perguntas.length > 0);
  return (
    <>
      <JsonLd dados={schemaPerguntas(PERGUNTAS)} />
      <PaginaInstitucional
        trilha={trilhaTema(SLUG)}
        titulo="Perguntas frequentes"
        abertura="As dúvidas mais comuns sobre o pedido pelo WhatsApp, as entregas, o bordado, as trocas e a sua conta neste aparelho."
        lateral={<LateralAjuda atual={`/ajuda/${SLUG}`} />}
      >
        <div className={css({ display: "grid", gap: { base: "12", desktop: "16" }, maxW: "leitura" })}>
          {grupos.map(({ tema, perguntas }) => (
            <section key={tema.slug} aria-labelledby={`grupo-${tema.slug}`}>
              <h2 id={`grupo-${tema.slug}`} className={tituloSecao}>
                {tema.slug === SLUG ? "Outras dúvidas" : tema.titulo}
              </h2>
              <div className={css({ mt: "5" })}>
                <Acordeao itens={perguntas} />
              </div>
            </section>
          ))}
        </div>
        <BlocoContato texto="Não achou sua dúvida? Fale com uma vendedora do ateliê pelo WhatsApp." />
      </PaginaInstitucional>
    </>
  );
}
