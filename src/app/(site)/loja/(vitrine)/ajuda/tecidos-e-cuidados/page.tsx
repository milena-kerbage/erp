import { css } from "styled-system/css";
import { prosa } from "@/loja/componentes/institucional/estilos";
import { BlocoContato, PaginaInstitucional } from "@/loja/componentes/institucional/PaginaInstitucional";
import { LateralAjuda, metadataTema, PerguntasDoTema, trilhaTema } from "@/loja/componentes/institucional/secoes";
import { AVISO_FICHA, cuidadosPorTecido } from "@/loja/lib/catalogo/fichas";

const SLUG = "tecidos-e-cuidados";
export const metadata = metadataTema(SLUG);

// "Cuidados com as peças": os mesmos cuidados das fichas dos produtos (lib/catalogo/fichas.ts), por
// tecido, para a página e a ficha nunca divergirem. [CONFIRMAR] os cuidados com o ateliê junto com
// as fichas (o arquivo de fichas ainda é de exemplo).
export default function TecidosECuidados() {
  const grupos = cuidadosPorTecido();
  return (
    <PaginaInstitucional
      trilha={trilhaTema(SLUG)}
      titulo="Cuidados com as peças"
      abertura="Peças de enxoval são lavadas muitas vezes. Seguindo os cuidados de cada tecido, elas ficam macias e bonitas por mais tempo."
      lateral={<LateralAjuda atual={`/ajuda/${SLUG}`} />}
    >
      <div className={prosa}>
        <h2 id="antes-do-primeiro-uso">Antes do primeiro uso</h2>
        <p>
          Lave o enxoval antes de usar, com sabão neutro e sem amaciante perfumado. Confira sempre a etiqueta e a ficha do produto, na aba
          Tecido e cuidados da página da peça.
        </p>

        <h2 id="por-tecido">Cuidados por tecido</h2>
      </div>

      <ul className={css({ display: "grid", gridTemplateColumns: { base: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: { base: "4", md: "5" }, mt: "6" })}>
        {grupos.map((grupo) => (
          <li key={grupo.tecidos.join("-")} className={cartaoTecido}>
            <h3 className={css({ fontSize: "lg", fontWeight: "medium", lineHeight: "texto", color: "escuro" })}>{grupo.tecidos.join(", ")}</h3>
            <p className={css({ mt: "1", fontSize: "sm", lineHeight: "texto", color: "textoSuave" })}>{grupo.composicoes.join("; ")}</p>
            <dl className={css({ display: "grid", gap: "3", mt: "4" })}>
              {grupo.cuidados.map(([rotulo, valor]) => (
                <div key={rotulo}>
                  <dt className={css({ fontSize: "sm", fontWeight: "medium", color: "escuro" })}>{rotulo}</dt>
                  <dd className={css({ fontSize: "sm", lineHeight: "texto", color: "texto" })}>{valor}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>

      <div className={prosa}>
        <h2 id="bordados">Peças bordadas</h2>
        <p>
          Lave pelo avesso, sem alvejante, e passe com ferro em temperatura baixa, com o bordado virado para baixo, para não amassar o relevo
          dos pontos. Não esfregue o bordado.
        </p>

        <h2 id="medidas-e-cores">Medidas e cores</h2>
        <p>{AVISO_FICHA.split(". Para o sono seguro")[0]}.</p>

        <h2 id="sono-seguro">Sono seguro</h2>
        <p>
          A Sociedade Brasileira de Pediatria recomenda o berço livre de protetores, travesseiros e objetos soltos enquanto o bebê dorme.
          Use essas peças na decoração do quarto e retire na hora de dormir.
        </p>
      </div>

      <PerguntasDoTema slug={SLUG} />
      <BlocoContato />
    </PaginaInstitucional>
  );
}

const cartaoTecido = css({
  p: { base: "5", md: "6" },
  borderWidth: "1px",
  borderColor: "borda",
  borderRadius: "cartao",
  bg: "superficie",
});
