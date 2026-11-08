import { ORIGEM_LOJA } from "@/lib/hosts";
import type { Regras } from "./urls";

export const ORIGEM = ORIGEM_LOJA;

// Regras iniciais de facetas. Fonte única para URLs, canonical e robots.txt.
// Entra faceta indexável só com demanda de busca comprovada (Search Console / Planejador) E produtos.
// Ao virar catálogo real, carregar da API (tag "regras-seo") em vez de manter aqui.
export const REGRAS_SEO: Regras = {
  categorias: {
    "kit-berco/kits": {
      facetasIndexaveis: [{ chave: "para", valores: ["menina", "menino", "neutro"] }],
    },
  },
  // "entrega": "pronta-entrega" (sai em até 2 dias úteis) ou "sob-encomenda" (feito no ateliê).
  // "tamanho": tamanho do berço/colchão. "personalizacao": bordado com nome.
  // "tema" e "estilo" também filtram a área Projetos (src/loja/lib/casas/filtragem.ts).
  parametrosFiltro: ["para", "cor", "tamanho", "tecido", "estilo", "tema", "entrega", "personalizacao", "preco", "retirada"],
};
