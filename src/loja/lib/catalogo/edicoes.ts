// Edição do mês (a "Monthly Edit" da shop.lululemon.com, lululemon-animacoes-edicao.md §3) e os blocos
// editoriais das categorias principais. TROCAR DE EDIÇÃO = editar só este arquivo: acrescente a nova
// em EDICOES (título, atalhos, produtos e blocos) e aponte EDICAO_ATUAL para ela.
//
// FOTOS E VÍDEOS: cada bloco aceita `midia.src` (foto .webp/.jpg ou vídeo .mp4/.webm, mudo e em loop).
// Os arquivos entram em public/vitrine/edicoes/<chave da edição>/… (caminhos sugeridos nos
// comentários; a origem de cada foto vai em CREDITOS.md na mesma pasta). Enquanto `src` estiver
// vazio, o bloco desenha a composição de espera no tom escolhido (Midia.tsx). Proporção sugerida:
// 1920 × 1472 (o bloco é 2 colunas × 1 card no desktop) com o assunto no centro, que no celular o
// bloco vira 4:5 e corta as laterais. Vídeo ganha o botão de pausa no canto.
//
// Sem imports locais (só tipos): roda no servidor e no `node --test` (tests/loja/edicoes.test.mjs).

import type { NomeIcone, TomMidia } from "@/loja/componentes/inicio/Midia";
import type { LadoBloco } from "./listagem";

export type MidiaBloco = {
  src?: string; // /vitrine/edicoes/<edição>/<arquivo>.webp|.mp4
  alt: string; // descreve a cena (bloco só de imagem é a "foto de campanha": o alt é o conteúdo)
  tom: TomMidia; // composição de espera enquanto não há foto; tons escuros sob texto branco
  icone: NomeIcone;
};

// Três tipos de bloco, pelo que vem preenchido:
// (a) texto sobreposto: `titulo` (+ `subtitulo`), sem `href`;
// (b) foto de campanha: só `midia`;
// (c) clicável: `titulo`, `href` e `acao` (o bloco inteiro é o link, com a pílula do CTA).
export type BlocoEditorial = {
  id: string;
  titulo?: string; // curto (título de 64 no desktop)
  subtitulo?: string; // uma linha (24–28)
  href?: string; // rota interna da loja
  acao?: string; // texto do CTA dos clicáveis
  midia: MidiaBloco;
  lado?: LadoBloco; // padrão: alterna, começando pela esquerda
};

export type Atalho = { rotulo: string; href: string };

export type Edicao = {
  chave: string; // pasta das fotos: public/vitrine/edicoes/<chave>/
  titulo: string; // h1 da página e título do slide da home
  subtitulo: string; // apoio do slide da home
  descricao: string; // meta description (até ~155 caracteres)
  atalhos: Atalho[]; // linha de atalhos do topo
  produtos: string[]; // slugs do catálogo, na ordem em que aparecem
  blocos: BlocoEditorial[];
  primeiraLinha?: number; // linha do 1º bloco (0 = abre a grade com ele)
};

export const ROTA_EDICAO = "/edicao-do-mes";

export const EDICOES: Record<string, Edicao> = {
  "primeiros-dias": {
    chave: "primeiros-dias",
    titulo: "Primeiros dias",
    subtitulo: "O enxoval das primeiras semanas em casa, feito à mão no ateliê.",
    descricao:
      "Edição do mês do Ateliê Milena Kerbage: paninhos, mantas, saídas de maternidade e o berço pronto para os primeiros dias do bebê.",
    atalhos: [
      { rotulo: "Kit berço", href: "/kit-berco" },
      { rotulo: "Enxoval", href: "/enxoval" },
      { rotulo: "Quarto", href: "/quarto" },
      { rotulo: "Maternidade", href: "/maternidade" },
      { rotulo: "Projetos", href: "/projetos" },
    ],
    produtos: [
      "kit-enxoval-primeiros-dias-12-pecas",
      "saida-de-maternidade-trico-cru",
      "manta-de-trico-trancada",
      "fraldas-de-boca-bordadas-kit-com-3",
      "cueiro-de-malha-estampado",
      "toalha-com-capuz-bordada",
      "kit-maternidade-chegada",
      "babador-bandana-kit-com-2",
      "bolsa-maternidade-classica-de-linho",
      "enfeite-de-porta-bordado",
      "saida-de-maternidade-trico-rose",
      "saida-de-maternidade-trico-azul-bebe",
      "kit-berco-jardim-rose",
      "kit-berco-nuvem-azul-bebe",
      "jogo-de-lencol-percal-200-fios",
      "protetor-de-berco-bordado-com-nome",
      "almofada-de-amamentacao",
      "capa-de-trocador-matelasse",
      "kit-bolsa-maternidade-3-pecas",
      "kit-berco-trico-cru-5-pecas",
      "mosquiteiro-de-teto-com-dossel",
      "almofada-nuvem",
      "tapete-redondo-de-croche",
      "kit-berco-nuvem-cru",
    ],
    blocos: [
      {
        // (a) abertura, com texto: public/vitrine/edicoes/primeiros-dias/abertura.mp4
        id: "abertura",
        titulo: "Primeiros dias",
        subtitulo: "Paninho, manta e colo: o que o bebê usa nas primeiras semanas.",
        midia: { alt: "Recém-nascido dormindo enrolado na manta de tricô cru", tom: "aconchego", icone: "lua" },
      },
      {
        // (c) clicável: public/vitrine/edicoes/primeiros-dias/pronta-entrega.webp
        id: "pronto-para-levar",
        titulo: "Pronto para levar",
        subtitulo: "Saídas, paninhos e kits que saem do ateliê em até 2 dias úteis.",
        href: "/pronta-entrega",
        acao: "Ver pronta entrega",
        midia: { alt: "Caixa do ateliê aberta com saída de maternidade e manta dobradas", tom: "musgo", icone: "pacote" },
      },
      {
        // (b) foto de campanha: public/vitrine/edicoes/primeiros-dias/banho.webp
        id: "banho",
        midia: { alt: "Bebê enrolado na toalha com capuz bordada depois do primeiro banho", tom: "azul", icone: "nuvem" },
      },
      {
        // (c) clicável: public/vitrine/edicoes/primeiros-dias/bordado.mp4
        id: "bordado",
        titulo: "Com o nome bordado",
        subtitulo: "Fralda, toalha e enfeite de porta com o nome do bebê, à mão.",
        href: "/busca?q=bordado",
        acao: "Ver peças com bordado",
        midia: { alt: "Mãos da bordadeira bordando um nome em linha rosê", tom: "noite", icone: "agulha" },
      },
    ],
  },
};

export const EDICAO_ATUAL: Edicao = EDICOES["primeiros-dias"];

// Categorias principais com 1 ou 2 blocos discretos, depois das 2 primeiras linhas de cards (só na
// 1ª página). Chave = categoria exata (as subcategorias não herdam).
export const LINHA_BLOCOS_CATEGORIA = 2;

export const BLOCOS_POR_CATEGORIA: Record<string, BlocoEditorial[]> = {
  "kit-berco": [
    {
      // public/vitrine/edicoes/categorias/kit-berco-quartinho.webp
      id: "kit-berco-quartinho",
      titulo: "Monte o quartinho completo",
      subtitulo: "Kit berço, cortina, tapete e enfeites no mesmo tema.",
      href: "/projetos",
      acao: "Conhecer os projetos",
      midia: { alt: "Quarto de bebê montado com kit berço sálvia e cortina de linho", tom: "salvia", icone: "berco" },
    },
  ],
  enxoval: [
    {
      // public/vitrine/edicoes/categorias/enxoval-edicao.webp
      id: "enxoval-edicao",
      titulo: EDICAO_ATUAL.titulo,
      subtitulo: "A edição do mês: o enxoval das primeiras semanas em casa.",
      href: ROTA_EDICAO,
      acao: "Ver a edição do mês",
      midia: { alt: "Paninhos bordados empilhados ao lado de uma manta de tricô", tom: "aconchego", icone: "coracao" },
    },
  ],
  quarto: [
    {
      // public/vitrine/edicoes/categorias/quarto-projetos.webp
      id: "quarto-projetos",
      titulo: "Quartinhos prontos",
      subtitulo: "O ateliê desenha o quarto no tema que você escolher.",
      href: "/projetos",
      acao: "Conhecer os projetos",
      midia: { alt: "Quarto de bebê com berço, mosquiteiro de dossel e tapete de crochê", tom: "musgo", icone: "nuvem" },
    },
    {
      // (b) foto de campanha: public/vitrine/edicoes/categorias/quarto-luz.webp
      id: "quarto-luz",
      midia: { alt: "Luz da tarde atravessando a cortina de voal sobre o berço", tom: "verde", icone: "folha" },
    },
  ],
  maternidade: [
    {
      // public/vitrine/edicoes/categorias/maternidade-mala.webp
      id: "maternidade-mala",
      titulo: "A mala pronta",
      subtitulo: "Bolsa, saída e enfeite de porta com o nome bordado.",
      href: "/busca?q=bordado",
      acao: "Ver peças com bordado",
      midia: { alt: "Bolsa maternidade de linho aberta com a saída de tricô dobrada dentro", tom: "noite", icone: "bolsa" },
    },
  ],
};

export function blocosDaCategoria(chave: string): BlocoEditorial[] {
  return BLOCOS_POR_CATEGORIA[chave] ?? [];
}
