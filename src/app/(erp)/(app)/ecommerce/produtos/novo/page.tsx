import type { Metadata } from "next";
import { EditorProduto } from "@/features/ecommerce/catalogo/EditorProduto";
import { origemDaLoja } from "@/features/ecommerce/catalogo/servidor";

export const metadata: Metadata = { title: "Novo produto" };
export default async function Page() {
  return <EditorProduto id={null} origemLoja={await origemDaLoja()} />;
}
