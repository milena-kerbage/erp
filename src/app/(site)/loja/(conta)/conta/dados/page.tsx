import { MolduraConta } from "@/loja/componentes/conta/MolduraConta";
import { DadosPessoais } from "@/loja/componentes/conta/PaginasConta";
import { metadataPagina } from "@/loja/lib/seo/institucional";

export const metadata = metadataPagina({ titulo: "Dados pessoais", descricao: "Seus dados na loja do Ateliê Milena Kerbage.", caminho: "/conta/dados", indexar: false });

export default function Dados() {
  return (
    <MolduraConta trilha={[{ rotulo: "Dados pessoais", href: "/conta/dados" }]}>
      <DadosPessoais />
    </MolduraConta>
  );
}
