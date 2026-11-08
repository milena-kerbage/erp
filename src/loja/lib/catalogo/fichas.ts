// Ficha técnica por peça do ateliê: identificação, tecido e enchimento, medidas, o que vem no kit,
// prazo e personalização, cuidados de lavagem e venda.
// EXEMPLO: valores típicos de enxoval artesanal, para o wireframe. [CONFIRMAR] cada valor com o
// ateliê antes de publicar: quando a API de catálogo existir, a ficha vem do cadastro do produto
// no ERP e este arquivo sai.

export type GrupoFicha = { titulo: string; itens: Array<[string, string]> };

export const AVISO_FICHA =
  "Peças feitas à mão no ateliê: as medidas podem variar até 2 cm e o tom do tecido muda levemente conforme a tela e o lote. Para o sono seguro, a Sociedade Brasileira de Pediatria recomenda o berço livre de protetores, travesseiros e objetos soltos enquanto o bebê dorme: use-os na decoração e retire na hora de dormir.";

type Item = [string, string];

type Dados = {
  nome: string;
  marca: string;
  sku: string;
  unidade: string;
  caminho: string;
  trilha: Array<{ rotulo: string }>;
  atributos: Record<string, string[]>;
  pecas?: string[];
  personalizacao?: string;
  variacao?: { titulo: string; opcoes: Array<{ rotulo: string }> };
};

// Tecido (faceta) → composição e cuidados de lavagem.
const TECIDOS: Record<string, { composicao: string; cuidados: Item[] }> = {
  "Percal 200 fios": { composicao: "100% algodão, percal 200 fios", cuidados: cuidadosPadrao() },
  Tricoline: { composicao: "100% algodão, tricoline", cuidados: cuidadosPadrao() },
  Malha: { composicao: "100% algodão, malha penteada", cuidados: cuidadosPadrao() },
  Piquet: { composicao: "100% algodão, piquet", cuidados: cuidadosPadrao() },
  Lesê: { composicao: "100% algodão, lesê bordado", cuidados: cuidadosPadrao() },
  Atoalhado: { composicao: "100% algodão, felpa dupla; capuz em tricoline 100% algodão", cuidados: cuidadosPadrao() },
  "Fralda de algodão": { composicao: "100% algodão, fralda dupla; barrado em tricoline", cuidados: cuidadosPadrao() },
  Linho: {
    composicao: "Linho misto (55% linho, 45% algodão)",
    cuidados: [
      ["Lavagem", "À mão ou na máquina em ciclo delicado, água fria e sabão neutro"],
      ["Secagem", "À sombra, estendido; não usar secadora"],
      ["Passar", "Ferro em temperatura média, com a peça ainda úmida"],
    ],
  },
  Tricô: {
    composicao: "Fio 100% algodão, tricô feito à mão",
    cuidados: [
      ["Lavagem", "À mão, água fria e sabão neutro; não torcer"],
      ["Secagem", "Na horizontal, à sombra, para não deformar"],
      ["Passar", "Não passar"],
    ],
  },
  Crochê: {
    composicao: "Barbante 100% algodão, crochê feito à mão",
    cuidados: [
      ["Lavagem", "À mão, água fria e sabão neutro"],
      ["Secagem", "Na horizontal, à sombra"],
      ["Limpeza do dia a dia", "Aspirador em potência baixa"],
    ],
  },
  Voal: {
    composicao: "100% poliéster, voal",
    cuidados: [
      ["Lavagem", "Na máquina em ciclo delicado, dentro de saco de lavagem"],
      ["Secagem", "Pendurado, à sombra"],
      ["Passar", "Ferro em temperatura baixa"],
    ],
  },
  Matelassê: { composicao: "Tricoline 100% algodão matelassado com manta acrílica", cuidados: cuidadosPadrao() },
};

function cuidadosPadrao(): Item[] {
  return [
    ["Lavagem", "Na máquina em ciclo delicado, água fria e sabão neutro; sem alvejante nem amaciante perfumado"],
    ["Secagem", "À sombra; não usar secadora"],
    ["Passar", "Ferro em temperatura baixa, com o bordado pelo avesso"],
  ];
}

// Categorias com enchimento (protetor, edredom, almofadas, kits de berço e mini cama).
const COM_ENCHIMENTO = ["/kit-berco/kits", "/kit-berco/protetores", "/kit-berco/edredons", "/kit-berco/travesseiros", "/quarto/almofadas", "/quarto/mini-cama", "/quarto/trocador"];

function grupos(...lista: Array<GrupoFicha | null>): GrupoFicha[] {
  return lista.filter((grupo): grupo is GrupoFicha => grupo !== null && grupo.itens.length > 0);
}

export function fichaTecnica(dados: Dados): GrupoFicha[] {
  const tecido = dados.atributos.tecido?.[0];
  const infoTecido = tecido ? TECIDOS[tecido] : undefined;
  const pronta = dados.atributos.entrega?.includes("Pronta entrega") ?? false;
  const cores = dados.atributos.cor ?? [];

  const identificacao: GrupoFicha = {
    titulo: "Identificação",
    itens: [
      ["Marca", dados.marca],
      ["Código", dados.sku],
      ["Categoria", dados.trilha.map((elo) => elo.rotulo).join(" › ")],
      ...(dados.atributos.para ? ([["Para", dados.atributos.para.join(", ")]] as Item[]) : []),
      ...(dados.atributos.tema ? ([["Tema", dados.atributos.tema.join(", ")]] as Item[]) : []),
      ...(cores.length ? ([[cores.length > 1 ? "Cores disponíveis" : "Cor", cores.join(", ")]] as Item[]) : []),
    ],
  };

  const tecidoEEnchimento: GrupoFicha = {
    titulo: "Tecido e enchimento",
    itens: [
      ...(infoTecido ? ([["Composição", infoTecido.composicao]] as Item[]) : []),
      ...(dados.atributos.estilo ? ([["Acabamento", dados.atributos.estilo.join(", ")]] as Item[]) : []),
      ...(COM_ENCHIMENTO.some((prefixo) => dados.caminho.startsWith(prefixo))
        ? ([["Enchimento", "Fibra siliconada antialérgica"]] as Item[])
        : []),
    ],
  };

  const medidas: GrupoFicha | null = dados.variacao
    ? { titulo: "Medidas", itens: [[dados.variacao.titulo, dados.variacao.opcoes.map((opcao) => opcao.rotulo).join("; ")]] }
    : null;

  const kit: GrupoFicha | null = dados.pecas?.length
    ? { titulo: "O que vem no kit", itens: dados.pecas.map((peca, indice) => [`Item ${indice + 1}`, peca] as Item) }
    : null;

  const prazo: GrupoFicha = {
    titulo: "Prazo e personalização",
    itens: [
      ["Disponibilidade", pronta ? "Pronta entrega" : "Sob encomenda"],
      ["Prazo de produção", pronta ? "Sai do ateliê em até 2 dias úteis" : "15 a 25 dias úteis, mais o prazo do frete"],
      ...(dados.personalizacao ? ([["Bordado", dados.personalizacao]] as Item[]) : []),
      ["Entrega", "Para todo o Brasil, ou retirada no ateliê em Fortaleza/CE"],
    ],
  };

  const cuidados: GrupoFicha | null = infoTecido ? { titulo: "Cuidados", itens: infoTecido.cuidados } : null;

  return grupos(identificacao, tecidoEEnchimento, medidas, kit, prazo, cuidados, {
    titulo: "Venda",
    itens: [
      ["Unidade de venda", dados.unidade],
      ["Embalagem", "Saquinho de algodão cru com laço, pronto para presente"],
    ],
  });
}
