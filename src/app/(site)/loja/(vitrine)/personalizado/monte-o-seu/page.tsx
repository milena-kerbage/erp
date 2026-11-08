import { redirect } from "next/navigation";
import { hrefEtapa } from "@/loja/lib/casas/etapas";

// /personalizado/monte-o-seu: a entrada do montador (menu, listagem, página do quartinho, sacola)
// abre a 1ª etapa, levando junto o ponto de partida (?projeto=<slug>) ou a edição (?editar=<id>).
export default async function PaginaMonteOSeu({ searchParams }: PageProps<"/loja/personalizado/monte-o-seu">) {
  const busca = await searchParams;
  const editar = typeof busca.editar === "string" ? busca.editar : undefined;
  const projeto = typeof busca.projeto === "string" ? busca.projeto : undefined;
  const destino = hrefEtapa("tema", editar);
  redirect(projeto ? `${destino}${destino.includes("?") ? "&" : "?"}projeto=${encodeURIComponent(projeto)}` : destino);
}
