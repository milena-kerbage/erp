import { css } from "styled-system/css";
import { MolduraConta } from "@/loja/componentes/conta/MolduraConta";
import { PaginaAcesso } from "@/loja/componentes/conta/PaginasConta";
import { metadataPagina } from "@/loja/lib/seo/institucional";

export const metadata = metadataPagina({
  titulo: "Entrar",
  descricao: "Entre na sua conta da loja do Ateliê Milena Kerbage para fazer e acompanhar pedidos.",
  caminho: "/conta/entrar",
  indexar: false,
});

// Login por e-mail e senha (contas de cliente da loja, separadas das da equipe). ?voltar=/caminho.
export default function Entrar() {
  return (
    <MolduraConta trilha={[{ rotulo: "Entrar", href: "/conta/entrar" }]}>
      <div className={css({ mt: { base: "8", desktop: "12" } })}>
        <PaginaAcesso inicial="entrar" />
      </div>
    </MolduraConta>
  );
}
