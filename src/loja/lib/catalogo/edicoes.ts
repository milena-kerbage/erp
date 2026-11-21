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

import { rotaOculta } from "../modulos.ts";
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
    subtitulo: "O enxoval das primeiras semanas em casa, bordado no ateliê.",
    descricao:
      "Edição do mês do Ateliê Milena Kerbage: paninhos, mantas, saídas de maternidade e o berço pronto para os primeiros dias do bebê.",
    atalhos: [
      { rotulo: "Kit berço", href: "/kit-berco" },
      { rotulo: "Enxoval", href: "/enxoval" },
      { rotulo: "Quarto", href: "/quarto" },
      { rotulo: "Maternidade", href: "/maternidade" },
      { rotulo: "Personalizado", href: "/personalizado" },
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

// Atalhos e blocos que levam a módulos desligados (src/loja/lib/modulos.ts) ficam de fora da edição no ar.
const semModulosOcultos = (edicao: Edicao): Edicao => ({ ...edicao, atalhos: edicao.atalhos.filter((atalho) => !rotaOculta(atalho.href)), blocos: edicao.blocos.filter((bloco) => !rotaOculta(bloco.href)) });
export const EDICAO_ATUAL: Edicao = semModulosOcultos(EDICOES["primeiros-dias"]);

// Categorias principais com 1 ou 2 blocos (vídeos do ateliê), depois das 2 primeiras linhas de cards (só na
// 1ª página). Chave = categoria exata (as subcategorias não herdam).
export const LINHA_BLOCOS_CATEGORIA = 2;

// Vídeos curtos do ateliê (public/vitrine/videos, 720 px, mudos, capa .webp ao lado): entram nas
// listagens das segmentações, não na home.
const V = (nome: string) => `/vitrine/videos/${nome}.mp4`;

const QUARTINHO: BlocoEditorial = {
  id: "kit-berco-quartinho",
  titulo: "Monte o quartinho completo",
  subtitulo: "Kit berço e complementares no mesmo tema. Qualquer item pode ser personalizado.",
  href: "/personalizado",
  acao: "Conhecer os quartinhos",
  midia: { src: V("kit-berco-menino"), alt: "Kit berço verde montado, com almofada bordada com o nome", tom: "salvia", icone: "berco" },
};

const MENINA: BlocoEditorial = {
  id: "kit-berco-menina",
  titulo: "Babados, flores e o nome",
  subtitulo: "Kits para menina em percal 230 fios ou 400 fios egípcios.",
  href: "/kit-berco/kits/menina",
  acao: "Ver kits para menina",
  midia: { src: V("kit-berco-menina"), alt: "Kit berço rosê com babados e almofada bordada", tom: "rose", icone: "flor" },
};

const BORDADO: BlocoEditorial = {
  id: "bordado-nome",
  titulo: "Com o nome bordado",
  subtitulo: "Nome, cor da linha e desenho combinados com o ateliê.",
  href: "/busca?q=bordado",
  acao: "Ver peças com bordado",
  midia: { src: V("bordado-nome"), alt: "Bordado do nome do bebê sendo feito no ateliê", tom: "noite", icone: "agulha" },
};

const COMPLEMENTARES: BlocoEditorial = {
  id: "complementares-ninho",
  titulo: "Tudo no mesmo tema",
  subtitulo: "Ninho, trocador e almofada de amamentação combinando com o kit berço.",
  href: "/itens-complementares",
  acao: "Ver complementares",
  midia: { src: V("ninho"), alt: "Ninho bordado com o nome do bebê", tom: "musgo", icone: "nuvem" },
};

const BLOCOS_BASE: Record<string, BlocoEditorial[]> = {
  "kit-berco": [QUARTINHO, MENINA],
  "kit-berco/kits": [COMPLEMENTARES, BORDADO],
  "kit-cama-kids": [
    {
      id: "kit-cama-kids",
      titulo: "A cama no mesmo tema",
      subtitulo: "Almofadões, almofadas bordadas, rolo e edredom. Qualquer item pode ser personalizado.",
      href: "/personalizado",
      acao: "Montar com o ateliê",
      midia: { src: V("kit-cama-kids"), alt: "Cama kids com almofadas bordadas e rolo com laço", tom: "linho", icone: "nuvem" },
    },
    BORDADO,
  ],
  "kit-maternidade": [
    {
      id: "kit-maternidade-paninhos",
      titulo: "Paninhos com o nome",
      subtitulo: "Cueiro, fralda, pano de boca e toalha com capuz, bordados para a maternidade.",
      href: "/kit-paninhos",
      acao: "Ver kit paninhos",
      midia: { src: V("kit-paninhos"), alt: "Paninhos bordados com o nome do bebê", tom: "aconchego", icone: "coracao" },
    },
    {
      id: "kit-maternidade-amamentacao",
      titulo: "Para amamentar com conforto",
      subtitulo: "Almofada de amamentação no mesmo tema do enxoval.",
      href: "/itens-complementares",
      acao: "Ver complementares",
      midia: { src: V("almofada-amamentacao"), alt: "Almofada de amamentação bordada", tom: "rose", icone: "coracao" },
    },
  ],
  "itens-complementares": [
    { ...COMPLEMENTARES, href: "/kit-berco/kits", acao: "Ver kits de berço" },
    {
      id: "complementares-amamentacao",
      titulo: "Para amamentar com conforto",
      subtitulo: "Almofada de amamentação bordada, combinando com o quartinho.",
      href: "/kit-maternidade",
      acao: "Ver kit maternidade",
      midia: { src: V("almofada-amamentacao"), alt: "Almofada de amamentação bordada", tom: "rose", icone: "coracao" },
    },
  ],
  "kit-paninhos": [
    {
      id: "paninhos-maternidade",
      titulo: "Do jeito da família",
      subtitulo: "Monte o kit com as peças, o tecido e o bordado que fizerem sentido.",
      href: "/kit-maternidade",
      acao: "Ver kit maternidade",
      midia: { src: V("kit-paninhos"), alt: "Paninhos bordados com o nome do bebê", tom: "aconchego", icone: "coracao" },
    },
    BORDADO,
  ],
  "para-presentear": [
    {
      id: "presentear-paninhos",
      titulo: "Presente com o nome",
      subtitulo: "Paninhos e toalhas bordados, embalados pelo ateliê.",
      href: "/kit-paninhos",
      acao: "Ver kit paninhos",
      midia: { src: V("kit-paninhos"), alt: "Paninhos bordados com o nome do bebê", tom: "aconchego", icone: "presente" },
    },
  ],
};

// O mesmo vídeo pode aparecer em mais de uma segmentação: o id ganha a categoria para ficar único.
export const BLOCOS_POR_CATEGORIA: Record<string, BlocoEditorial[]> = Object.fromEntries(
  Object.entries(BLOCOS_BASE).map(([chave, blocos]) => [chave, blocos.map((bloco) => ({ ...bloco, id: `${chave.replace("/", "-")}--${bloco.id}` }))]),
);

export function blocosDaCategoria(chave: string): BlocoEditorial[] {
  return (BLOCOS_POR_CATEGORIA[chave] ?? []).filter((bloco) => !rotaOculta(bloco.href));
}
