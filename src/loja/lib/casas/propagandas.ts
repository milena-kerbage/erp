// Propagandas da área Projetos para as listagens de produto, só como dados: o módulo de propagandas
// das listagens escolhe onde e como exibir. Ainda sem fotos: o card mostra o placeholder com o ícone
// de bebê (campo "foto" opcional; quando houver, public/vitrine/projetos/<slug>/foto-1.webp).
// Sem promessa de preço ou condição. Sem imports locais (roda no `node --test`): os números citados
// são conferidos contra o catálogo em tests/loja/casas.test.mjs.

export type PropagandaProjeto = {
  titulo: string;
  apoio: string; // frase de apoio abaixo do título
  acao: string; // texto do CTA
  href: string; // sempre dentro de /projetos
  foto?: string; // 16:10; sem foto = placeholder
  alt: string;
};

/** Nome antigo, mantido porque GradeListagem importa o tipo por este nome. */
export type PropagandaCasa = PropagandaProjeto;

// Onde fazem sentido: quem procura kit berço e decoração de quarto pode querer o quarto inteiro.
export const CATEGORIAS_PROPAGANDAS_PROJETOS = ["kit-berco", "quarto"] as const;

export const PROPAGANDAS_PROJETOS: PropagandaProjeto[] = [
  {
    titulo: "O quartinho inteiro, no tema.",
    apoio: "Conheça os 13 projetos do ateliê: kit berço, cortina, tapete e enfeites pensados juntos.",
    acao: "Ver os projetos",
    href: "/projetos",
    alt: "Quarto de bebê completo do Ateliê Milena Kerbage",
  },
  {
    titulo: "Neutro, para menina ou menino.",
    apoio: "Linho cru, sálvia e off-white em quartinhos que acompanham o bebê por muitos anos.",
    acao: "Ver projetos neutros",
    href: "/projetos/neutro",
    alt: "Projeto de quarto de bebê em tons neutros",
  },
  {
    titulo: "Com o nome do bebê.",
    apoio: "No pacote Completo personalizado, o nome bordado à mão e peças exclusivas.",
    acao: "Peça seu projeto",
    href: "/projetos/orcamento",
    alt: "Bordado do nome do bebê feito no ateliê",
  },
];
