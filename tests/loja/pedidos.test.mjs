import assert from "node:assert/strict";
import test from "node:test";
import {
  buscarNoHistorico,
  criarPedidoEnviado,
  dataDoEnvio,
  gerarNumeroPedido,
  interpretarHistorico,
  MAXIMO_PEDIDOS,
  mensagemDeReenvio,
  quantidadeDePecas,
  registrarNoHistorico,
  removerDoHistorico,
} from "../../src/loja/lib/pedidos/historico.ts";

// "Minha conta neste aparelho": pedidos enviados pelo WhatsApp guardados no navegador.

const AGORA = new Date("2026-11-08T17:32:00Z"); // 14:32 em Fortaleza
const sempre = (valor) => () => valor;

const linhas = [
  {
    nome: "Kit berço Jardim rosê 9 peças",
    codigo: "MK-1001",
    quantidade: 2,
    detalhes: ["Cor: Rosê", "Bordado: Com bordado do nome"],
    precoCentavos: 149000,
    slug: "kit-berco-jardim-rose",
    href: "/produto/kit-berco-jardim-rose",
    modulos: [{ nome: "extra que não deve ir para o storage" }],
  },
  { nome: "Manta de tricô", quantidade: 1, detalhes: [], precoCentavos: 26900 },
];

function pedido(extra = {}) {
  return criarPedidoEnviado({
    itens: linhas,
    cupom: { codigo: "ENXOVAL10", descontoCentavos: 32490 },
    retirar: false,
    local: "  Recife/PE ",
    mensagem: "Olá, Ateliê Milena Kerbage! Quero fazer este pedido",
    agora: AGORA,
    aleatorio: sempre(0),
    ...extra,
  });
}

test("número do pedido: data de Fortaleza e sufixo sem caracteres ambíguos", () => {
  assert.equal(gerarNumeroPedido(AGORA, sempre(0)), "MK-261108-2222");
  assert.equal(gerarNumeroPedido(new Date("2026-11-09T02:00:00Z"), sempre(0)), "MK-261108-2222"); // 23h do dia 8 em Fortaleza
  assert.match(gerarNumeroPedido(AGORA), /^MK-261108-[2-9A-HJ-NP-Z]{4}$/);
});

test("criar o registro: totais, cupom, local aparado e só os campos conhecidos dos itens", () => {
  const registro = pedido();
  assert.equal(registro.numero, "MK-261108-2222");
  assert.equal(registro.enviadoEm, AGORA.toISOString());
  assert.equal(registro.subtotalCentavos, 2 * 149000 + 26900);
  assert.equal(registro.totalCentavos, 2 * 149000 + 26900 - 32490);
  assert.deepEqual(registro.cupom, { codigo: "ENXOVAL10", descontoCentavos: 32490 });
  assert.equal(registro.local, "Recife/PE");
  assert.equal(registro.itens[0].href, "/produto/kit-berco-jardim-rose");
  assert.equal("modulos" in registro.itens[0], false);
  assert.equal(registro.itens[1].slug, undefined);
  assert.equal(quantidadeDePecas(registro), 3);
  const semCupom = pedido({ cupom: { codigo: "X", descontoCentavos: 0 }, local: "" });
  assert.equal(semCupom.cupom, undefined);
  assert.equal(semCupom.local, undefined);
  assert.equal(semCupom.totalCentavos, semCupom.subtotalCentavos);
});

test("interpretar o storage: descarta lixo, repetidos e links externos; mais novo primeiro", () => {
  const antigo = { ...pedido(), numero: "MK-261101-AAAA", enviadoEm: "2026-11-01T12:00:00.000Z" };
  const novo = pedido();
  const bruto = JSON.stringify([
    antigo,
    novo,
    { ...novo }, // repetido
    { numero: "MK-X", enviadoEm: "ontem", itens: [], mensagem: "x" }, // data inválida e sem itens
    { ...novo, numero: "MK-261108-BBBB", itens: [{ nome: "Peça", quantidade: 1, detalhes: [], precoCentavos: 100, href: "https://golpe.com" }] },
    null,
    "texto",
  ]);
  const lista = interpretarHistorico(bruto);
  assert.deepEqual(
    lista.map((item) => item.numero),
    ["MK-261108-2222", "MK-261108-BBBB", "MK-261101-AAAA"],
  );
  assert.equal(lista[1].itens[0].href, undefined);
  assert.deepEqual(interpretarHistorico("{quebrado"), []);
  assert.deepEqual(interpretarHistorico(null), []);
  assert.deepEqual(interpretarHistorico('{"a":1}'), []);
});

test("registrar, buscar e remover; o histórico guarda no máximo os mais recentes", () => {
  let lista = [];
  for (let indice = 0; indice < MAXIMO_PEDIDOS + 5; indice++) lista = registrarNoHistorico(lista, { ...pedido(), numero: `MK-${indice}` });
  assert.equal(lista.length, MAXIMO_PEDIDOS);
  assert.equal(lista[0].numero, `MK-${MAXIMO_PEDIDOS + 4}`);
  assert.equal(buscarNoHistorico(lista, ` mk-${MAXIMO_PEDIDOS + 4} `)?.numero, `MK-${MAXIMO_PEDIDOS + 4}`);
  lista = removerDoHistorico(lista, `MK-${MAXIMO_PEDIDOS + 4}`);
  assert.equal(buscarNoHistorico(lista, `MK-${MAXIMO_PEDIDOS + 4}`), undefined);
  assert.equal(lista.length, MAXIMO_PEDIDOS - 1);
});

test("reenvio: a mesma mensagem com a data do pedido; data por extenso em Fortaleza", () => {
  const registro = pedido();
  assert.equal(mensagemDeReenvio(registro), `(Reenviando o pedido que montei no site em 08/11/2026.)\n\n${registro.mensagem}`);
  assert.equal(dataDoEnvio(registro.enviadoEm), "8 de novembro de 2026, 14:32");
});
