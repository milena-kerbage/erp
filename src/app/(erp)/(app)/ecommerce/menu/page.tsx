import type { Metadata } from "next";
import { MenuSite } from "@/features/ecommerce/catalogo/MenuSite";
import { origemDaLoja } from "@/features/ecommerce/catalogo/servidor";

export const metadata: Metadata = { title: "Menu do site" };
export default async function Page() {
  return <MenuSite origemLoja={await origemDaLoja()} />;
}
