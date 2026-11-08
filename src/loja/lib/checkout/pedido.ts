// Pedido pelo WhatsApp: a loja é um CATÁLOGO COM PREÇO. A cliente monta a sacola, deixa nome e
// WhatsApp e o site abre a conversa com o ateliê com a mensagem pronta; uma vendedora confirma
// valores, bordado, frete, prazo e pagamento ali. Nada é cobrado no site.
// Puro (sem React nem navegador): roda no `node --test` (tests/loja/checkout.test.mjs).
import { type Erros, telefoneValido } from "./validacao.ts";

export type ClientePedido = {
  nome: string;
  whatsapp: string;
  local: string; // cidade/UF ou CEP (opcional): ajuda a vendedora a cotar o frete
  retirar: boolean; // prefere retirar no ateliê, em Fortaleza
  observacoes: string; // nome para o bordado, data prevista do parto etc. (opcional)
  email?: string; // e-mail da conta da cliente (pedido feito com conta)
};

export type LinhaPedido = {
  nome: string;
  codigo?: string; // SKU, para a vendedora achar a peça
  quantidade: number;
  detalhes: string[]; // "Cor: Rosê", "Tamanho do berço: …", "Bordado: …"; no projeto, "Pacote: …"
  precoCentavos: number; // preço unitário de tabela
  // Projeto de quarto (pacote + opcionais) e quartinho personalizado (módulos do "Monte o seu"): o que
  // vem, com as opções e o "a partir de" de cada parte.
  tipo?: "projeto" | "personalizado";
  modulos?: { nome: string; detalhe?: string; precoCentavos: number }[];
};

// Prazo de produção dos projetos de quarto (lib/carrinho/totais.ts, PRODUCAO_PROJETO).
const PRAZO_PROJETOS = "20 a 35 dias úteis";

export const LIMITE_LOCAL = 80;
export const LIMITE_OBSERVACOES = 500;

export function errosPedido(cliente: ClientePedido): Erros {
  const erros: Erros = {};
  if (cliente.nome.trim().split(/\s+/).filter(Boolean).length < 2) erros.nome = "Informe nome e sobrenome.";
  if (!telefoneValido(cliente.whatsapp)) erros.whatsapp = "Informe o WhatsApp com DDD.";
  if (cliente.local.trim().length > LIMITE_LOCAL) erros.local = `Use até ${LIMITE_LOCAL} caracteres.`;
  if (cliente.observacoes.trim().length > LIMITE_OBSERVACOES) erros.observacoes = `Use até ${LIMITE_OBSERVACOES} caracteres.`;
  return erros;
}

// "R$ 1.490,00" com espaço comum (a mensagem vai como texto puro para o WhatsApp).
export function reaisTexto(valorCentavos: number): string {
  const inteiro = Math.floor(Math.abs(valorCentavos) / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const fracao = String(Math.abs(valorCentavos) % 100).padStart(2, "0");
  return `${valorCentavos < 0 ? "-" : ""}R$ ${inteiro},${fracao}`;
}

// Texto da conversa: itens com quantidade, detalhes e valores "a partir de" (no projeto e no quartinho
// personalizado, também o que vem, parte por parte), cupom, a menção ao 5% OFF no Pix (sem calcular
// o valor) e os dados da cliente. O frete fica para a conversa.
export function montarMensagemPedido({
  linhas,
  cliente,
  cupom,
  descontoPixPercentual,
  numero,
}: {
  linhas: LinhaPedido[];
  cliente: ClientePedido;
  // `rotulo`: como o cupom aparece na mensagem (ex.: "Cupom de primeira compra BEMVINDA-7Q3F (5% OFF)").
  cupom?: { codigo: string; descontoCentavos: number; rotulo?: string };
  descontoPixPercentual: number;
  numero?: string; // número do pedido registrado no servidor (pedido feito com conta)
}): string {
  const subtotal = linhas.reduce((soma, linha) => soma + linha.precoCentavos * linha.quantidade, 0);
  const desconto = cupom?.descontoCentavos ?? 0;
  const itens = linhas.map((linha, indice) => {
    const total = linha.precoCentavos * linha.quantidade;
    const modulos = linha.modulos ?? [];
    return [
      `${indice + 1}) ${linha.nome}${linha.codigo ? ` (cód. ${linha.codigo})` : ""}${linha.tipo === "personalizado" ? " [montado no site]" : ""}`,
      `   Quantidade: ${linha.quantidade}`,
      ...linha.detalhes.map((detalhe) => `   ${detalhe}`),
      ...(modulos.length > 0
        ? [
            `   ${linha.tipo === "personalizado" ? "Peças escolhidas" : "O que vem"}:`,
            ...modulos.map(
              (modulo) => `   - ${modulo.nome}${modulo.detalhe ? ` (${modulo.detalhe})` : ""}: a partir de ${reaisTexto(modulo.precoCentavos)}`,
            ),
          ]
        : []),
      linha.quantidade > 1
        ? `   A partir de ${reaisTexto(linha.precoCentavos)} cada (${reaisTexto(total)})`
        : `   A partir de ${reaisTexto(total)}`,
    ].join("\n");
  });
  const valores = [
    `Subtotal a partir de ${reaisTexto(subtotal)}`,
    ...(cupom && desconto > 0 ? [`${cupom.rotulo ?? `Cupom ${cupom.codigo}`}: -${reaisTexto(desconto)}`] : []),
    `Total estimado a partir de ${reaisTexto(subtotal - desconto)}, sem o frete`,
    `Vi que no Pix tem ${descontoPixPercentual}% OFF.`,
    ...(linhas.some((linha) => linha.tipo)
      ? [`Os quartinhos personalizados são feitos sob encomenda (produção de ${PRAZO_PROJETOS}): podemos conferir as medidas do berço e da janela?`]
      : []),
  ];
  const dados = [
    `Nome: ${cliente.nome.trim()}`,
    `WhatsApp: ${cliente.whatsapp.trim()}`,
    ...(cliente.email?.trim() ? [`E-mail: ${cliente.email.trim()}`] : []),
    ...(cliente.local.trim() ? [`Cidade/UF ou CEP: ${cliente.local.trim()}`] : []),
    cliente.retirar ? "Prefiro retirar no ateliê, em Fortaleza." : "Quero receber em casa: podemos combinar o frete e o prazo?",
    ...(cliente.observacoes.trim() ? [`Observações: ${cliente.observacoes.trim()}`] : []),
  ];
  return [
    numero
      ? `Olá, Ateliê Milena Kerbage! Quero fazer o pedido ${numero}, que montei no site:`
      : "Olá, Ateliê Milena Kerbage! Quero fazer este pedido que montei no site:",
    itens.join("\n\n"),
    valores.join("\n"),
    `Meus dados:\n${dados.join("\n")}`,
  ].join("\n\n");
}

// Link do WhatsApp com a mensagem: https://wa.me/<número só com dígitos>?text=<texto codificado>.
export function linkWhatsApp(numero: string, texto: string): string {
  return `https://wa.me/${numero.replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`;
}
