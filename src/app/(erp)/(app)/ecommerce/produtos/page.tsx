import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProdutosLista } from "@/features/ecommerce/catalogo/ProdutosLista";
import { origemDaLoja } from "@/features/ecommerce/catalogo/servidor";

export const metadata: Metadata = { title: "Produtos da loja" };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // Atalho "Novo produto" do painel do e-commerce (/ecommerce/produtos?novo=1): abre o editor de cadastro.
  if ((await searchParams).novo === "1") redirect("/ecommerce/produtos/novo");
  return <ProdutosLista origemLoja={await origemDaLoja()} />;
}
