import { MolduraConta } from "@/loja/componentes/conta/MolduraConta";
import { Seguranca } from "@/loja/componentes/conta/PaginasConta";
import { metadataPagina } from "@/loja/lib/seo/institucional";

export const metadata = metadataPagina({ titulo: "Segurança", descricao: "Senha, sessão e exclusão da conta.", caminho: "/conta/seguranca", indexar: false });

export default function PaginaSeguranca() {
  return (
    <MolduraConta trilha={[{ rotulo: "Segurança", href: "/conta/seguranca" }]}>
      <Seguranca />
    </MolduraConta>
  );
}
