import type { Icon } from "@phosphor-icons/react";
import { Armchair, Baby, Cloud, Flower, Heart, PawPrint } from "@/loja/componentes/icones";
import type { Elo } from "@/loja/lib/catalogo/categorias";

// Peças comuns da área Projetos.

// Atalhos do topo da listagem (a fileira de subcoleções da Lululemon em CabecalhoListagem): enquanto
// não há fotos, vão como ícone e texto. Os mesmos caminhos do menu "Projetos" (navegacao.ts).
export const ATALHOS_PROJETOS: Array<Elo & { icone: Icon }> = [
  { rotulo: "Para menina", href: "/projetos/menina", icone: Heart },
  { rotulo: "Para menino", href: "/projetos/menino", icone: Baby },
  { rotulo: "Floral", href: "/projetos/floral", icone: Flower },
  { rotulo: "Safári", href: "/projetos/safari", icone: PawPrint },
  { rotulo: "Nuvens e céu", href: "/projetos/nuvens", icone: Cloud },
  { rotulo: "Clássico", href: "/projetos/classico", icone: Armchair },
];

// Atalhos para as páginas de seleção: os de cima mais "Neutros" (que não cabe na fileira de 6 da raiz).
export const ATALHOS_SELECOES: Array<Elo & { icone: Icon }> = [
  ...ATALHOS_PROJETOS.slice(0, 2),
  { rotulo: "Neutros", href: "/projetos/neutro", icone: Cloud },
  ...ATALHOS_PROJETOS.slice(2),
];
