import { redirect } from "next/navigation";

/** Configurações abre direto na primeira seção. */
export default function SettingsPage() {
  redirect("/configuracoes/usuarios");
}
