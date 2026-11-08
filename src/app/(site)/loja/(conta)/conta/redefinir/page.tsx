import type { Metadata } from "next";
import { MolduraConta } from "@/loja/componentes/conta/MolduraConta";
import { RedefinirSenha } from "@/loja/componentes/conta/PaginasConta";

// Link de redefinição gerado pela equipe no ERP e enviado pela vendedora no WhatsApp: /conta/redefinir#token.
// O token fica no fragmento (não chega ao servidor nem aos logs) e não vaza pelo Referer.
export const metadata: Metadata = { title: "Criar uma senha nova", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default function Redefinir() {
  return (
    <MolduraConta trilha={[{ rotulo: "Senha nova", href: "/conta/redefinir" }]}>
      <RedefinirSenha />
    </MolduraConta>
  );
}
