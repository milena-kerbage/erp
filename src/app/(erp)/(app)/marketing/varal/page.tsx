import type { Metadata } from "next";
import { origemDaLoja } from "@/features/ecommerce/catalogo/servidor";
import { VaralMarketing } from "@/features/marketing/Varal";

export const metadata: Metadata = { title: "Varal de roupinhas" };
export default async function Page() {
  return <VaralMarketing origemLoja={await origemDaLoja()} />;
}
