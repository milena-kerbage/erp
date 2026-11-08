import Link from "next/link";
import { css } from "styled-system/css";
import { botao } from "styled-system/recipes";
import { RESPIRO_LATERAL } from "@/loja/componentes/layout/cabecalho/estilos";
import type { BlocoEditorial } from "@/loja/lib/catalogo/edicoes";
import type { Produto } from "@/loja/lib/catalogo/exemplos";
import { filtrar, type ItemListavel, ordenar } from "@/loja/lib/catalogo/listagem";
import { type ContextoPropaganda, escolherPropagandas } from "@/loja/lib/catalogo/propagandas";
import { type Contexto, montarUrl } from "@/loja/lib/catalogo/urlsListagem";
import { AreaListagem } from "./AreaListagem";
import { GradeListagem } from "./GradeListagem";

export const POR_PAGINA = 24;

// Resultado de categoria ou busca: aplica filtros e ordem, pagina e entrega a grade à área
// interativa (barra flutuante + gaveta). A gaveta recebe só o essencial de cada item para contar
// os filtros ao vivo no navegador. Blocos editoriais (edição do mês e categorias principais) entram
// só na 1ª página, a partir da linha `primeiraLinhaBlocos`.
export function Resultado({
  contexto,
  itensBase,
  filtros,
  ordem,
  pagina,
  blocos = [],
  primeiraLinhaBlocos = 0,
}: {
  contexto: Contexto;
  itensBase: Produto[];
  filtros: Record<string, string[]>;
  ordem: string;
  pagina: number;
  blocos?: BlocoEditorial[];
  primeiraLinhaBlocos?: number;
}) {
  const filtrados = ordenar(filtrar(itensBase, filtros), ordem);
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const atual = Math.min(pagina, totalPaginas);
  const daPagina = filtrados.slice((atual - 1) * POR_PAGINA, atual * POR_PAGINA);
  const essenciais: ItemListavel[] = itensBase.map(({ slug, nome, marca, caminho, preco, atributos, selo }) => ({
    slug,
    nome,
    marca,
    caminho,
    preco,
    atributos,
    selo,
  }));
  const ate = (atual - 1) * POR_PAGINA + daPagina.length;

  const vazio = (
    <div className={css({ px: RESPIRO_LATERAL, py: "24", textAlign: "center" })}>
      <p className={css({ fontSize: "2xl", color: "escuro" })}>Nenhuma peça com esses filtros.</p>
      <p className={css({ mt: "2", color: "textoSuave" })}>Tire algum filtro ou fale com o ateliê pelo WhatsApp: muita coisa é feita sob encomenda.</p>
      <Link
        href={montarUrl(contexto, {}, ordem)}
        className={css({ display: "inline-block", mt: "6", textDecoration: "underline", textUnderlineOffset: "3px" })}
      >
        Limpar filtros
      </Link>
    </div>
  );

  return (
    <AreaListagem
      contexto={contexto}
      filtros={filtros}
      ordem={ordem}
      itensBase={essenciais}
      grade={
        daPagina.length > 0 ? (
          <GradeListagem
            produtos={daPagina}
            semente={`${sementeDe(contexto)}:${atual}`}
            propagandas={escolherPropagandas(contextoPropaganda(contexto, itensBase))}
            blocos={atual === 1 ? blocos : []}
            primeiraLinhaBlocos={primeiraLinhaBlocos}
          />
        ) : (
          vazio
        )
      }
    >
      {filtrados.length > POR_PAGINA && (
        <nav aria-label="Paginação" className={css({ display: "grid", justifyItems: "center", gap: "4", px: RESPIRO_LATERAL, pb: "24" })}>
          <p className={css({ fontSize: "sm", color: "textoSuave" })}>
            Mostrando {(atual - 1) * POR_PAGINA + 1}–{ate} de {filtrados.length} peças
          </p>
          <div aria-hidden className={css({ w: "[240px]", h: "[2px]", bg: "borda" })}>
            <div className={css({ h: "full", bg: "escuro" })} style={{ width: `${(ate / filtrados.length) * 100}%` }} />
          </div>
          <div className={css({ display: "flex", gap: "3" })}>
            {atual > 1 && (
              <Link href={montarUrl(contexto, filtros, ordem, atual - 1)} className={botao({ variante: "contorno", tamanho: "m" })}>
                Página anterior
              </Link>
            )}
            {atual < totalPaginas && (
              <Link href={montarUrl(contexto, filtros, ordem, atual + 1)} className={botao({ variante: "escuro", tamanho: "m" })}>
                Ver mais peças
              </Link>
            )}
          </div>
        </nav>
      )}
    </AreaListagem>
  );
}

// Semente do sorteio das propagandas: a categoria ou o termo buscado (mais a página).
function sementeDe(contexto: Contexto): string {
  return contexto.tipo === "categoria" ? contexto.categoria : `busca:${contexto.termo}`;
}

// Propagandas: pela categoria ou, na busca, pelo termo e pelas categorias dos resultados.
function contextoPropaganda(contexto: Contexto, itens: Produto[]): ContextoPropaganda {
  return contexto.tipo === "categoria" ? contexto : { tipo: "busca", termo: contexto.termo, caminhos: itens.map((item) => item.caminho) };
}
