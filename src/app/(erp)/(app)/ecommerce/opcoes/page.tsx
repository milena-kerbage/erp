import type { Metadata } from "next";
import { Opcoes } from "@/features/ecommerce/catalogo/Opcoes";

export const metadata: Metadata = { title: "Opções dos produtos" };
export default function Page() {
  return <Opcoes />;
}
