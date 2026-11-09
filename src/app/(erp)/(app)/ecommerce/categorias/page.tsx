import type { Metadata } from "next";
import { Categorias } from "@/features/ecommerce/catalogo/Categorias";
import { origemDaLoja } from "@/features/ecommerce/catalogo/servidor";

export const metadata: Metadata = { title: "Categorias da loja" };
export default async function Page() {
  return <Categorias origemLoja={await origemDaLoja()} />;
}
