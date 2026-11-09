import type { Metadata } from "next";
import { Colecoes } from "@/features/ecommerce/catalogo/Colecoes";

export const metadata: Metadata = { title: "Coleções da loja" };
export default function Page() {
  return <Colecoes />;
}
