// Linhas da sacola e do pedido: cada item (produto, projeto de quarto ou quartinho personalizado) vira
// o mesmo formato que a sacola, a confirmação e o pedido pelo WhatsApp já sabem mostrar
// (ProdutoCarrinho). Produto vem do catálogo enviado pelo servidor; projeto e quartinho são montados
// aqui, com o preço "a partir de" da escolha (pacote + opcionais, ou módulos + bordado).
// Puro (sem React nem navegador): roda no `node --test` (tests/loja/carrinho.test.mjs).

import {
  buscarOpcional,
  buscarProjeto,
  fotosDoProjeto,
  opcionaisValidos,
  PACOTES,
  pacoteValido,
  precoDoPacote,
  precoDoProjeto,
  variacaoProjeto,
} from "../casas/catalogo.ts";
import { atributosDoQuartinho, buscarPaleta, linhasDoQuartinho, nomeDoQuartinho, normalizarQuartinho, precoDoQuartinho } from "../casas/modulos.ts";
import type { LinhaPedido } from "../checkout/pedido.ts";
import type { ProdutoCarrinho } from "./catalogo.ts";
import { type ItemCarrinho, ROTULO_PERSONALIZACAO, tipoDe } from "./item.ts";
import { centavos, DESCONTO_PIX_PERCENTUAL, decimal, PRODUCAO_PROJETO } from "./totais.ts";

const MARCA = "Milena Kerbage";

function base(centavos: number): Pick<ProdutoCarrinho, "preco" | "pix" | "retirada" | "prontaEntrega" | "precisaEscolher" | "complementos" | "semelhantes" | "marca" | "sku"> {
  return {
    sku: "",
    marca: MARCA,
    preco: decimal(centavos),
    pix: decimal(Math.round((centavos * (100 - DESCONTO_PIX_PERCENTUAL)) / 100)),
    // [CONFIRMAR] com o ateliê: o projeto também pode ser retirado no ateliê quando a produção terminar.
    retirada: true,
    prontaEntrega: false,
    precisaEscolher: false,
    complementos: [],
    semelhantes: [],
  };
}

// Projeto de quarto: nome, pacote e opcionais como atributos, preço da escolha e o que vem (pacote e
// cada opcional com o seu "a partir de"), para a mensagem do pedido.
export function produtoDoProjeto(item: ItemCarrinho): ProdutoCarrinho | undefined {
  const projeto = buscarProjeto(item.slug);
  if (!projeto) return undefined;
  const pacote = pacoteValido(item.pacote);
  const opcionais = opcionaisValidos(projeto, item.opcionais);
  const dadosPacote = PACOTES.find((atual) => atual.nome === pacote);
  return {
    ...base(precoDoProjeto(projeto, pacote, opcionais) * 100),
    tipo: "projeto",
    slug: projeto.slug,
    nome: projeto.nome,
    foto: fotosDoProjeto(projeto)[0],
    unidade: "projeto",
    href: `/projetos/${projeto.slug}`,
    paleta: projeto.paleta.map((cor) => cor.hex),
    cor: variacaoProjeto(projeto),
    atributos: [
      `Pacote: ${pacote}`,
      ...(opcionais.length > 0 ? [`Opcionais: ${opcionais.map((id) => buscarOpcional(id)?.curto ?? id).join(", ")}`] : []),
      `Paleta: ${projeto.paleta.map((cor) => cor.nome).join(", ")}`,
    ],
    modulos: [
      { nome: `Pacote ${pacote}`, detalhe: dadosPacote?.itens.join("; "), precoCentavos: precoDoPacote(projeto, pacote) * 100 },
      ...opcionais.map((id) => {
        const opcional = buscarOpcional(id);
        return { nome: opcional?.curto ?? id, detalhe: opcional?.apoio.replace(/\.$/, ""), precoCentavos: (opcional?.preco ?? 0) * 100 };
      }),
    ],
    producao: PRODUCAO_PROJETO,
  };
}

// Quartinho personalizado: cada módulo com as opções e o preço, o bordado e o tamanho do berço.
export function produtoDoQuartinho(item: ItemCarrinho): ProdutoCarrinho | undefined {
  const quartinho = normalizarQuartinho(item.quartinho);
  if (quartinho.modulos.length === 0) return undefined;
  const linhas = linhasDoQuartinho(quartinho);
  return {
    ...base(precoDoQuartinho(quartinho) * 100),
    tipo: "personalizado",
    slug: item.slug,
    nome: nomeDoQuartinho(quartinho),
    unidade: "projeto",
    href: `/projetos/monte-o-seu?editar=${encodeURIComponent(item.slug)}`,
    paleta: buscarPaleta(quartinho.paleta)?.cores.map((cor) => cor.hex),
    atributos: atributosDoQuartinho(quartinho),
    modulos: linhas.map((linha) => ({ nome: linha.nome, detalhe: linha.detalhe, precoCentavos: linha.preco * 100 })),
    producao: PRODUCAO_PROJETO,
  };
}

// O que a sacola mostra para o item; undefined = indisponível (fica fora do total, com aviso).
export function resolverItem(item: ItemCarrinho, porSlug: Map<string, ProdutoCarrinho>): ProdutoCarrinho | undefined {
  const tipo = tipoDe(item);
  if (tipo === "projeto") return produtoDoProjeto(item);
  if (tipo === "personalizado") return produtoDoQuartinho(item);
  return porSlug.get(item.slug);
}

// Linhas de atributos do item na sacola (12, cinza): cor, tamanho do berço, bordado e a unidade
// quando não é "peça"; no projeto, pacote, opcionais e paleta; no quartinho, tema, paleta, berço,
// bordado e a lista de módulos.
export function atributosDoItem(produto: ProdutoCarrinho, item: Pick<ItemCarrinho, "variacao" | "personalizacao">): string[] {
  if (produto.atributos) {
    const modulos = produto.tipo === "personalizado" ? (produto.modulos ?? []) : [];
    return modulos.length > 0
      ? [...produto.atributos, `${modulos.length} ${modulos.length === 1 ? "item" : "itens"}: ${modulos.map((modulo) => modulo.nome).join(", ")}`]
      : produto.atributos;
  }
  return [
    produto.cor && `Cor: ${produto.cor}`,
    item.variacao && `${produto.variacaoTitulo ?? "Opção"}: ${item.variacao}`,
    item.personalizacao && `Bordado: ${ROTULO_PERSONALIZACAO[item.personalizacao]}`,
    produto.unidade !== "peça" && `Vendido por ${produto.unidade}`,
  ].filter((linha): linha is string => Boolean(linha));
}

// Linha do pedido pelo WhatsApp: no projeto e no quartinho, os detalhes são os atributos (sem a lista
// de módulos, que vai à parte, com o preço de cada um).
export function linhaDoPedido(item: ItemCarrinho, produto: ProdutoCarrinho): LinhaPedido {
  return {
    nome: produto.nome,
    ...(produto.sku ? { codigo: produto.sku } : {}),
    quantidade: item.quantidade,
    detalhes: produto.tipo ? (produto.atributos ?? []) : atributosDoItem(produto, item),
    precoCentavos: centavos(produto.preco),
    ...(produto.tipo ? { tipo: produto.tipo, modulos: produto.modulos ?? [] } : {}),
  };
}
