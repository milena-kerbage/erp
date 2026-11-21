import type { Metadata } from "next";
import { LeadsView } from "@/features/leads/components/LeadsView";
import type { FiltrosIniciais } from "@/features/clients/components/ClientsTable";

export const metadata: Metadata = {
  title: "Leads e clientes",
};

const lista = (valor: string | string[] | undefined) => (valor === undefined ? [] : Array.isArray(valor) ? valor : [valor]);
const um = <T extends string>(valor: string | string[] | undefined, aceitos: readonly T[]) => (typeof valor === "string" && (aceitos as readonly string[]).includes(valor) ? (valor as T) : undefined);

/**
 * Leads e clientes numa tela só: kanban por funil ou a tabela de todos, com a categoria (Cliente ou Lead).
 * Os cartões do Painel abrem a tabela já filtrada: ?etapa=funil:etapa (pode repetir), ?origem= (pode repetir),
 * ?criados=7|30|90, ?nascimento=30|60|90|none e ?parados=1.
 */
export default async function LeadsPage({ searchParams }: PageProps<"/leads">) {
  const { funil, categoria, visao, etapa, origem, criados, nascimento, parados } = await searchParams;
  const funnelId = typeof funil === "string" ? funil : undefined;
  const categoriaInicial = categoria === "cliente" || categoria === "lead" ? categoria : undefined;
  const filtros: FiltrosIniciais = {
    etapas: lista(etapa).filter((item) => /^[\w-]{1,60}:[\w-]{1,60}$/.test(item)).slice(0, 20),
    origens: lista(origem).filter((item) => item.length > 0 && item.length <= 150).slice(0, 20),
    criados: um(criados, ["7", "30", "90"] as const),
    nascimento: um(nascimento, ["30", "60", "90", "none"] as const),
    parados: parados === "1",
  };
  const filtrado = Boolean(filtros.etapas?.length || filtros.origens?.length || filtros.criados || filtros.nascimento || filtros.parados);
  return (
    <LeadsView
      // Outro link do Painel com filtros diferentes remonta a tabela com o recorte novo.
      key={filtrado ? JSON.stringify(filtros) : undefined}
      funnelId={funnelId}
      categoriaInicial={categoriaInicial}
      filtrosIniciais={filtrado ? filtros : undefined}
      visaoInicial={visao === "tabela" || categoriaInicial || filtrado ? "table" : visao === "kanban" ? "kanban" : undefined}
    />
  );
}
