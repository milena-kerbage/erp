import { redirect } from "next/navigation";

/** Os pedidos da loja online mudaram para o módulo E-commerce. */
export default function Page() {
  redirect("/ecommerce/pedidos");
}
