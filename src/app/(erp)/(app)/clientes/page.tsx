import { redirect } from "next/navigation";

/** Clientes agora fica junto dos leads, na mesma tabela (filtro "Categoria"). */
export default function ClientsPage() {
  redirect("/leads?visao=tabela&categoria=cliente");
}
