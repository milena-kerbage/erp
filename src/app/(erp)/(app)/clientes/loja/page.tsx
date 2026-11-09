import { redirect } from "next/navigation";

/** As clientes da loja online mudaram para o módulo E-commerce. */
export default function Page() {
  redirect("/ecommerce/clientes");
}
