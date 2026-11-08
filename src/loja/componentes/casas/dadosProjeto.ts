import type { NomeIcone, TomMidia } from "@/loja/componentes/inicio/Midia";
import type { FotoGaleria } from "@/loja/componentes/produto/dados";
import type { AbaProjeto } from "./GavetaProjeto";
import {
  buscarOpcional,
  ENTREGA,
  formatarPreco,
  fotosDoProjeto,
  PACOTES,
  PRAZO_PRODUCAO,
  type Projeto,
  prazoDoProjeto,
  precoDoPacote,
  rotuloEstilo,
  rotuloTecido,
  rotuloTema,
} from "@/loja/lib/casas/catalogo";
import { buscarModulo, type IconeModulo } from "@/loja/lib/casas/modulos";
import { AVISO_FICHA } from "@/loja/lib/catalogo/fichas";

// Dados de apresentação da página do projeto, calculados no servidor (como produto/dados.ts): fotos
// da galeria (ou as mídias de espera nos tons da paleta), abas da gaveta e as peças do quarto.

// Tons das mídias de espera mais próximos de cada cor da paleta: a galeria e o visualizador da página
// de produto (reaproveitados aqui) trabalham com os tons da marca, não com cor livre.
const TONS: Array<[TomMidia, string]> = [
  ["rose", "#E9C9C3"],
  ["azul", "#C6D7E3"],
  ["verde", "#AEB8A0"],
  ["cru", "#EDE6D6"],
  ["cinza", "#C9CAC4"],
  ["branco", "#FFFFFF"],
  // Não há tom amarelo nem terroso: amarelos e caramelos caem no cru.
  ["cru", "#F1DE9E"],
  ["cru", "#C9A57A"],
];
const TONS_EXTRAS: Array<[TomMidia, string]> = [
  ["salviaClara", "#C9D1BD"],
  ["linho", "#EEF0E8"],
  ["areia", "#EAEBE3"],
];

function rgb(hex: string): [number, number, number] {
  const valor = Number.parseInt(hex.slice(1), 16);
  return [(valor >> 16) & 255, (valor >> 8) & 255, valor & 255];
}

function tomMaisProximo(hex: string, tons = TONS): TomMidia {
  const [r, g, b] = rgb(hex);
  let melhor = tons[0];
  let distancia = Number.POSITIVE_INFINITY;
  for (const tom of tons) {
    const [r2, g2, b2] = rgb(tom[1]);
    const atual = (r - r2) ** 2 + (g - g2) ** 2 + (b - b2) ** 2;
    if (atual < distancia) {
      distancia = atual;
      melhor = tom;
    }
  }
  return melhor[0];
}

const ICONES_ESTILO: Record<Projeto["estilo"], [NomeIcone, NomeIcone]> = {
  floral: ["flor", "tulipa"],
  nuvens: ["nuvem", "estrela"],
  safari: ["folha", "coracao"],
  classico: ["agulha", "pena"],
};

// 5 quadros (o quarto, o berço, o bordado, a janela e os enfeites) nos tons da paleta, ou as fotos
// publicadas em public/vitrine/projetos/<slug>/ quando houver.
export function fotosDaGaleria(projeto: Projeto): FotoGaleria[] {
  const [icone1, icone2] = ICONES_ESTILO[projeto.estilo];
  const publicadas = fotosDoProjeto(projeto);
  const cores = projeto.paleta.map((cor) => cor.hex);
  const quadros: Array<{ legenda: string; tom: TomMidia; icone: NomeIcone }> = [
    { legenda: "o quarto completo", tom: tomMaisProximo(cores[0]), icone: "bebe" },
    { legenda: "o kit berço", tom: tomMaisProximo(cores[1] ?? cores[0], [...TONS, ...TONS_EXTRAS]), icone: "berco" },
    { legenda: "detalhe do bordado", tom: tomMaisProximo(cores[2] ?? cores[0], [...TONS, ...TONS_EXTRAS]), icone: icone1 },
    { legenda: "cortina e tapete", tom: "linho", icone: "lua" },
    { legenda: "almofadas e enfeite de porta", tom: "areia", icone: icone2 },
  ];
  if (publicadas.length > 0) {
    return publicadas.map((foto, indice) => ({
      src: foto.src,
      alt: foto.alt,
      tom: quadros[indice % quadros.length].tom,
      icone: quadros[indice % quadros.length].icone,
      principal: indice === 0,
    }));
  }
  return quadros.map((quadro, indice) => ({
    alt: `${projeto.nome}: ${quadro.legenda} (foto em breve)`,
    tom: quadro.tom,
    icone: quadro.icone,
    principal: indice === 0,
  }));
}

// Composição e cuidados por tecido principal. [CONFIRMAR] com o ateliê.
const COMPOSICAO: Record<Projeto["tecido"], string> = {
  linho: "Linho lavado com forro de algodão",
  tricoline: "Tricoline 100% algodão",
  percal: "Percal 200 fios, 100% algodão",
};

export function abasDoProjeto(projeto: Projeto): AbaProjeto[] {
  const opcionais = projeto.opcionais.flatMap((id) => buscarOpcional(id) ?? []);
  return [
    {
      chave: "detalhes",
      titulo: "Detalhes",
      grupos: [
        { titulo: "Sobre o quartinho", itens: projeto.descricao.map((paragrafo, indice) => [`Item ${indice + 1}`, paragrafo]) },
        {
          titulo: "Ficha do quartinho",
          itens: [
            ["Tema", rotuloTema(projeto.tema)],
            ["Estilo", rotuloEstilo(projeto.estilo)],
            ["Tecido principal", rotuloTecido(projeto.tecido)],
            ["Paleta", projeto.paleta.map((cor) => cor.nome).join(", ")],
            ["Prazo de produção", `${prazoDoProjeto(projeto)} (quartinhos do ateliê: ${PRAZO_PRODUCAO})`],
            ["Entrega", `${ENTREGA}, com frete a combinar pelo WhatsApp`],
          ],
        },
        {
          titulo: "Pacotes",
          itens: PACOTES.map((pacote) => [pacote.nome, `a partir de ${formatarPreco(precoDoPacote(projeto, pacote.nome))}: ${pacote.itens.join("; ")}`]),
        },
      ],
      nota: "Valores \"a partir de\": a vendedora confirma o valor final pelo WhatsApp, com 5% OFF no Pix.",
    },
    {
      chave: "pecas",
      titulo: "O que vem no quartinho",
      grupos: [
        { titulo: "No pacote Completo", itens: projeto.pecas.map((peca, indice) => [`Item ${indice + 1}`, peca]) },
        ...(opcionais.length > 0
          ? [{ titulo: "Para completar (opcional)", itens: opcionais.map((opcional, indice): [string, string] => [`Item ${indice + 1}`, `${opcional.nome}: + ${formatarPreco(opcional.preco)}`]) }]
          : []),
      ],
      nota: "No Essencial vêm o kit berço e a cortina; no Completo personalizado, também o bordado do nome e peças exclusivas. Quer outra combinação? Monte o seu quartinho peça por peça.",
    },
    {
      chave: "tecido",
      titulo: "Tecidos e cuidados",
      grupos: [
        {
          titulo: "Tecidos",
          itens: [
            ["Tecido principal", COMPOSICAO[projeto.tecido]],
            ["Enchimento", "Fibra siliconada antialérgica (protetor e almofadas)"],
            ["Bordado", "Linha de algodão, feito à mão no ateliê"],
          ],
        },
        {
          titulo: "Cuidados",
          itens: [
            ["Item 1", "Lavar à mão ou na máquina em ciclo delicado, com água fria"],
            ["Item 2", "Sabão neutro, sem alvejante nem amaciante"],
            ["Item 3", "Secar à sombra, na horizontal"],
            ["Item 4", "Passar do avesso em temperatura baixa, sem passar sobre o bordado"],
          ],
        },
      ],
      nota: AVISO_FICHA,
    },
  ];
}

// Peças do quarto ("O que vem no quarto"): cada peça do pacote Completo ligada ao módulo do montador
// pelo nome (ícone e, quando existe, a peça do catálogo para o link) e os opcionais do projeto.
const MODULO_DA_PECA: Array<[RegExp, string]> = [
  [/kit berço/i, "kit-berco"],
  [/cortina|dossel/i, "cortina"],
  [/tapete/i, "tapete"],
  [/almofada/i, "almofadas"],
  [/enfeite de porta/i, "enfeite-porta"],
];

export type PecaDoQuarto = { nome: string; detalhe?: string; icone: IconeModulo; produto?: string; opcional?: string };

export function pecasDoQuarto(projeto: Projeto): PecaDoQuarto[] {
  const pecas = projeto.pecas.map((peca): PecaDoQuarto => {
    const id = MODULO_DA_PECA.find(([padrao]) => padrao.test(peca))?.[1];
    const modulo = id ? buscarModulo(id) : undefined;
    return { nome: peca, detalhe: modulo?.nome, icone: modulo?.icone ?? "bebe", produto: modulo?.produto };
  });
  const opcionais = projeto.opcionais.flatMap((id): PecaDoQuarto[] => {
    const opcional = buscarOpcional(id);
    const modulo = buscarModulo(id);
    return opcional ? [{ nome: opcional.nome, detalhe: opcional.apoio, icone: modulo?.icone ?? "bebe", produto: opcional.produto, opcional: `+ ${formatarPreco(opcional.preco)}` }] : [];
  });
  return [...pecas, ...opcionais];
}
