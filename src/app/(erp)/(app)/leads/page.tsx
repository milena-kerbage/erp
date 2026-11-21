import type { Metadata } from "next";
import { LeadsView } from "@/features/leads/components/LeadsView";

export const metadata: Metadata = {
  title: "Leads e clientes",
};

/** Leads e clientes numa tela só: kanban por funil ou a tabela de todos, com a categoria (Cliente ou Lead). */
export default async function LeadsPage({ searchParams }: PageProps<"/leads">) {
  const { funil, categoria, visao } = await searchParams;
  const funnelId = typeof funil === "string" ? funil : undefined;
  const categoriaInicial = categoria === "cliente" || categoria === "lead" ? categoria : undefined;
  return <LeadsView funnelId={funnelId} categoriaInicial={categoriaInicial} visaoInicial={visao === "tabela" || categoriaInicial ? "table" : visao === "kanban" ? "kanban" : undefined} />;
}
