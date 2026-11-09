import type { Metadata } from "next";
import { EditorProduto } from "@/features/ecommerce/catalogo/EditorProduto";
import { origemDaLoja } from "@/features/ecommerce/catalogo/servidor";

export const metadata: Metadata = { title: "Editar produto" };
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ id }, busca] = await Promise.all([params, searchParams]);
  // key: trocar de produto (ex.: depois de duplicar) começa o editor do zero.
  return <EditorProduto key={id} id={id} origemLoja={await origemDaLoja()} copia={busca.copia === "1"} criado={busca.criado === "1"} />;
}
