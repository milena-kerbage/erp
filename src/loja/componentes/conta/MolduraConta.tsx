import "server-only";
import type { ReactNode } from "react";
import { css } from "styled-system/css";
import { TrilhaNavegacao } from "@/loja/componentes/institucional/PaginaInstitucional";
import { catalogoParaCarrinho } from "@/loja/lib/carrinho/catalogo";
import type { Elo } from "@/loja/lib/seo/institucional";
import type { FotosPorSlug } from "./comum";
import { NavConta } from "./NavConta";

// Topo das páginas da conta: trilha ("Página inicial / Minha conta / …", `trilha` = o que vem depois
// de "Minha conta") e as abas.
export function MolduraConta({ trilha = [], children }: { trilha?: Elo[]; children: ReactNode }) {
  return (
    <>
      <TrilhaNavegacao elos={[{ rotulo: "Minha conta", href: "/conta" }, ...trilha]} />
      <div className={css({ mt: "5" })}>
        <NavConta />
      </div>
      {children}
    </>
  );
}

// Só a foto de cada peça do catálogo, para as miniaturas dos pedidos enviados.
export function fotosDoCatalogo(): FotosPorSlug {
  return Object.fromEntries(catalogoParaCarrinho().map((produto) => [produto.slug, produto.foto]));
}
