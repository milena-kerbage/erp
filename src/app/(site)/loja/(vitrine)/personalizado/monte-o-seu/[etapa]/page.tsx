import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EtapaDoMontador } from "@/loja/componentes/casas/Montador";
import { buscarEtapa, ehEtapa, IDS_ETAPAS } from "@/loja/lib/casas/etapas";

// Uma etapa do "Monte o seu quartinho" (tema, berço, quarto, banho e maternidade, bordado e resumo).
// O estado fica no layout (Montador); a página escolhe a etapa e dá o título da aba. Fora do índice
// como o resto do catálogo de exemplo (preços fictícios).
type Props = PageProps<"/loja/personalizado/monte-o-seu/[etapa]">;

export const dynamicParams = false;

export function generateStaticParams() {
  return IDS_ETAPAS.map((etapa) => ({ etapa }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const etapa = buscarEtapa((await params).etapa);
  if (!etapa) return {};
  return {
    title: `${etapa.titulo} · Monte o seu quartinho personalizado`,
    description:
      "Monte o quarto do bebê peça por peça com o Ateliê Milena Kerbage: tema, paleta, kit berço, cortina, tapete, almofadas, paninhos e bolsa maternidade, com o valor a partir de na hora.",
    alternates: { canonical: `/personalizado/monte-o-seu/${etapa.id}` },
    robots: { index: false, follow: true },
  };
}

export default async function PaginaEtapa({ params }: Props) {
  const { etapa } = await params;
  if (!ehEtapa(etapa)) notFound();
  return <EtapaDoMontador etapa={etapa} />;
}
