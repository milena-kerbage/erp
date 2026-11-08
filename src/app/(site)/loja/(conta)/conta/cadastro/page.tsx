import { css } from "styled-system/css";
import { MolduraConta } from "@/loja/componentes/conta/MolduraConta";
import { PaginaAcesso } from "@/loja/componentes/conta/PaginasConta";
import { metadataPagina } from "@/loja/lib/seo/institucional";

export const metadata = metadataPagina({
  titulo: "Criar conta",
  descricao: "Crie a sua conta na loja do Ateliê Milena Kerbage e ganhe 5% OFF na primeira compra.",
  caminho: "/conta/cadastro",
  indexar: false,
});

// Cadastro rápido (nome, WhatsApp, e-mail, senha e o aceite) com o cupom de primeira compra. ?voltar=/caminho.
export default function Cadastro() {
  return (
    <MolduraConta trilha={[{ rotulo: "Criar conta", href: "/conta/cadastro" }]}>
      <div className={css({ mt: { base: "8", desktop: "12" } })}>
        <PaginaAcesso inicial="criar" />
      </div>
    </MolduraConta>
  );
}
