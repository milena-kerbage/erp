import { redirect } from "next/navigation";

/** Marketing abre direto na primeira ação (por enquanto, a única). */
export default function MarketingPage() {
  redirect("/marketing/varal");
}
