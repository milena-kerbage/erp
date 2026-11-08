// Pedidos enviados pelo WhatsApp NESTE aparelho ("Minha conta neste aparelho").
// A loja não tem login nem pedido no servidor: o pedido é a conversa com a vendedora. Para a cliente
// rever o que mandou e reenviar a mensagem, o checkout (PaginaPedido) guarda um resumo no
// localStorage do navegador, na chave CHAVE_HISTORICO. Nada disso vai para o servidor.
// Puro (sem React nem navegador): roda no `node --test` (tests/loja/pedidos.test.mjs).

export const CHAVE_HISTORICO = "mk_pedidos_enviados";
export const MAXIMO_PEDIDOS = 20; // os mais antigos saem quando passa disso
const LIMITE_MENSAGEM = 12_000; // a mensagem já vem limitada pelo formulário; isto só barra lixo no storage

// Uma linha do pedido como foi enviada. `slug` (foto do catálogo) e `href` (link da peça) são
// opcionais: a linha continua legível mesmo se a peça sair do catálogo.
export type ItemEnviado = {
  slug?: string;
  href?: string; // caminho interno da peça ("/produto/x"), quando houver
  nome: string;
  codigo?: string;
  quantidade: number;
  detalhes: string[]; // "Cor: Rosê", "Tamanho do berço: …", "Bordado: …"
  precoCentavos: number; // preço unitário "a partir de" no momento do envio
};

export type PedidoEnviado = {
  numero: string; // só para a cliente se achar na lista (não vai na mensagem nem existe no ateliê)
  enviadoEm: string; // ISO
  itens: ItemEnviado[];
  subtotalCentavos: number;
  cupom?: { codigo: string; descontoCentavos: number };
  totalCentavos: number; // subtotal − cupom, sem o frete
  retirar: boolean; // preferiu retirar no ateliê
  local?: string; // cidade/UF ou CEP informado
  mensagem: string; // o texto exato que abriu no WhatsApp (para reenviar)
};

// "MK-261108-7Q3F": data do envio (aaMMdd, fuso de Brasília) + 4 caracteres aleatórios.
export function gerarNumeroPedido(agora: Date, aleatorio: () => number = Math.random): string {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza", year: "2-digit", month: "2-digit", day: "2-digit" })
    .formatToParts(agora)
    .reduce<Record<string, string>>((acc, parte) => ({ ...acc, [parte.type]: parte.value }), {});
  const alfabeto = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // sem 0/O e 1/I, que se confundem
  const sufixo = Array.from({ length: 4 }, () => alfabeto[Math.floor(aleatorio() * alfabeto.length) % alfabeto.length]).join("");
  return `MK-${partes.year}${partes.month}${partes.day}-${sufixo}`;
}

export function criarPedidoEnviado({
  itens,
  cupom,
  retirar,
  local,
  mensagem,
  agora = new Date(),
  aleatorio = Math.random,
}: {
  itens: ItemEnviado[];
  cupom?: { codigo: string; descontoCentavos: number };
  retirar: boolean;
  local?: string;
  mensagem: string;
  agora?: Date;
  aleatorio?: () => number;
}): PedidoEnviado {
  const validos = itens.map(itemValido).filter((item): item is ItemEnviado => item !== null);
  const subtotal = validos.reduce((soma, item) => soma + item.precoCentavos * item.quantidade, 0);
  const desconto = cupom && cupom.descontoCentavos > 0 ? cupom.descontoCentavos : 0;
  return {
    numero: gerarNumeroPedido(agora, aleatorio),
    enviadoEm: agora.toISOString(),
    // Só os campos conhecidos (a linha do pedido pode trazer outros, como os módulos de um projeto).
    itens: validos,
    subtotalCentavos: subtotal,
    ...(cupom && desconto > 0 ? { cupom: { codigo: cupom.codigo, descontoCentavos: desconto } } : {}),
    totalCentavos: Math.max(0, subtotal - desconto),
    retirar,
    ...(local?.trim() ? { local: local.trim() } : {}),
    mensagem,
  };
}

const texto = (valor: unknown, maximo: number): valor is string => typeof valor === "string" && valor.length > 0 && valor.length <= maximo;
const inteiro = (valor: unknown, minimo: number, maximo: number): valor is number =>
  typeof valor === "number" && Number.isInteger(valor) && valor >= minimo && valor <= maximo;

function itemValido(bruto: unknown): ItemEnviado | null {
  if (!bruto || typeof bruto !== "object") return null;
  const item = bruto as Record<string, unknown>;
  if (!texto(item.nome, 300) || !inteiro(item.quantidade, 1, 999) || !inteiro(item.precoCentavos, 0, 1e9)) return null;
  return {
    ...(texto(item.slug, 200) ? { slug: item.slug } : {}),
    // Só caminho interno: o storage pode ter sido editado à mão.
    ...(texto(item.href, 300) && item.href.startsWith("/") && !item.href.startsWith("//") ? { href: item.href } : {}),
    nome: item.nome,
    ...(texto(item.codigo, 60) ? { codigo: item.codigo } : {}),
    quantidade: item.quantidade,
    detalhes: Array.isArray(item.detalhes) ? item.detalhes.filter((linha): linha is string => texto(linha, 300)).slice(0, 20) : [],
    precoCentavos: item.precoCentavos,
  };
}

// O storage pode ter sido editado à mão ou vir de uma versão antiga: só passa o que tem a forma certa.
export function pedidoValido(bruto: unknown): PedidoEnviado | null {
  if (!bruto || typeof bruto !== "object") return null;
  const pedido = bruto as Record<string, unknown>;
  if (!texto(pedido.numero, 40) || !texto(pedido.enviadoEm, 40) || Number.isNaN(Date.parse(pedido.enviadoEm))) return null;
  if (!texto(pedido.mensagem, LIMITE_MENSAGEM) || !Array.isArray(pedido.itens)) return null;
  const itens = pedido.itens.map(itemValido).filter((item): item is ItemEnviado => item !== null);
  if (itens.length === 0) return null;
  const cupomBruto = pedido.cupom as Record<string, unknown> | undefined;
  const cupom = cupomBruto && texto(cupomBruto.codigo, 30) && inteiro(cupomBruto.descontoCentavos, 1, 1e9)
    ? { codigo: cupomBruto.codigo, descontoCentavos: cupomBruto.descontoCentavos }
    : undefined;
  const subtotal = itens.reduce((soma, item) => soma + item.precoCentavos * item.quantidade, 0);
  return {
    numero: pedido.numero,
    enviadoEm: pedido.enviadoEm,
    itens,
    subtotalCentavos: subtotal,
    ...(cupom ? { cupom } : {}),
    totalCentavos: Math.max(0, subtotal - (cupom?.descontoCentavos ?? 0)),
    retirar: pedido.retirar === true,
    ...(texto(pedido.local, 80) ? { local: pedido.local } : {}),
    mensagem: pedido.mensagem,
  };
}

// Lista do storage: inválidos e números repetidos saem; o mais novo primeiro.
export function interpretarHistorico(bruto: string | null): PedidoEnviado[] {
  let valor: unknown;
  try {
    valor = JSON.parse(bruto ?? "[]");
  } catch {
    return [];
  }
  if (!Array.isArray(valor)) return [];
  const vistos = new Set<string>();
  return valor
    .map(pedidoValido)
    .filter((pedido): pedido is PedidoEnviado => {
      if (!pedido || vistos.has(pedido.numero)) return false;
      vistos.add(pedido.numero);
      return true;
    })
    .sort((a, b) => Date.parse(b.enviadoEm) - Date.parse(a.enviadoEm))
    .slice(0, MAXIMO_PEDIDOS);
}

export function registrarNoHistorico(lista: PedidoEnviado[], pedido: PedidoEnviado): PedidoEnviado[] {
  return [pedido, ...lista.filter((atual) => atual.numero !== pedido.numero)].slice(0, MAXIMO_PEDIDOS);
}

export function removerDoHistorico(lista: PedidoEnviado[], numero: string): PedidoEnviado[] {
  return lista.filter((pedido) => pedido.numero !== numero);
}

export function buscarNoHistorico(lista: PedidoEnviado[], numero: string): PedidoEnviado | undefined {
  const alvo = numero.trim().toUpperCase();
  return lista.find((pedido) => pedido.numero.toUpperCase() === alvo);
}

// "8 de novembro de 2026, 14:32" no fuso de Fortaleza.
export function dataDoEnvio(iso: string): string {
  const data = new Date(iso);
  const dia = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Fortaleza", day: "numeric", month: "long", year: "numeric" }).format(data);
  const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Fortaleza", hour: "2-digit", minute: "2-digit" }).format(data);
  return `${dia}, ${hora}`;
}

// Reenvio: a mesma mensagem, com uma linha antes avisando que é a repetição de um pedido já mandado.
export function mensagemDeReenvio(pedido: PedidoEnviado): string {
  const dia = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Fortaleza", day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(pedido.enviadoEm),
  );
  return `(Reenviando o pedido que montei no site em ${dia}.)\n\n${pedido.mensagem}`;
}

export function quantidadeDePecas(pedido: PedidoEnviado): number {
  return pedido.itens.reduce((soma, item) => soma + item.quantidade, 0);
}
