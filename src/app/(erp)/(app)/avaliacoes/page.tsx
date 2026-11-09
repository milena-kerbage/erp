import { redirect } from "next/navigation";

/** A moderação de avaliações mudou para o módulo E-commerce. */
export default function Page() {
  redirect("/ecommerce/avaliacoes");
}
