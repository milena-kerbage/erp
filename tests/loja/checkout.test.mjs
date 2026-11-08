import assert from "node:assert/strict";
import test from "node:test";
import { errosPedido, linkWhatsApp, montarMensagemPedido, reaisTexto } from "../../src/loja/lib/checkout/pedido.ts";
import {
  cnpjValido,
  cpfValido,
  emailValido,
  mascararCnpj,
  mascararCpf,
  mascararTelefone,
  telefoneValido,
} from "../../src/loja/lib/checkout/validacao.ts";

test("CPF e CNPJ: dígito verificador, repetidos e máscara", () => {
  assert.equal(cpfValido("529.982.247-25"), true);
  assert.equal(cpfValido("529.982.247-24"), false);
  assert.equal(cpfValido("111.111.111-11"), false);
  assert.equal(cpfValido("123"), false);
  assert.equal(cnpjValido("13.592.162/0001-08"), true); // CNPJ do próprio ateliê (lib/empresa.ts)
  assert.equal(cnpjValido("13.592.162/0001-09"), false);
  assert.equal(cnpjValido("00000000000000"), false);
  assert.equal(mascararCpf("5299822"), "529.982.2");
  assert.equal(mascararCnpj("13592162000108"), "13.592.162/0001-08");
});

test("telefone e e-mail", () => {
  assert.equal(mascararTelefone("21992882282"), "(21) 99288-2282");
  assert.equal(mascararTelefone("2122334455"), "(21) 2233-4455");
  assert.equal(telefoneValido("(21) 99288-2282"), true);
  assert.equal(telefoneValido("(21) 89288-2282"), false); // 11 dígitos sem o 9 do celular
  assert.equal(emailValido("mae@familia.com.br"), true);
  assert.equal(emailValido("mae@familia"), false);
});

const cliente = { nome: "Ana Souza", whatsapp: "(85) 99288-2282", local: "", retirar: false, observacoes: "" };

test("pedido pelo WhatsApp: nome e telefone obrigatórios, resto opcional com limite", () => {
  assert.deepEqual(errosPedido(cliente), {});
  assert.deepEqual(Object.keys(errosPedido({ ...cliente, nome: "Ana", whatsapp: "8599" })).sort(), ["nome", "whatsapp"]);
  assert.deepEqual(Object.keys(errosPedido({ ...cliente, local: "x".repeat(81), observacoes: "y".repeat(501) })).sort(), [
    "local",
    "observacoes",
  ]);
});

test("mensagem do pedido: itens, detalhes, valores a partir de, 5% OFF no Pix e dados da cliente", () => {
  const texto = montarMensagemPedido({
    linhas: [
      {
        nome: "Kit berço Jardim rosê 9 peças",
        codigo: "MK-1001",
        quantidade: 2,
        detalhes: ["Cor: Rosê", "Tamanho do berço: Berço padrão · 60 × 130 cm", "Bordado: Com bordado do nome"],
        precoCentavos: 149000,
      },
      { nome: "Manta de tricô trançada", quantidade: 1, detalhes: [], precoCentavos: 26900 },
    ],
    cliente: { ...cliente, local: "Fortaleza/CE", retirar: true, observacoes: "Nome no bordado: Helena" },
    cupom: { codigo: "ENXOVAL10", descontoCentavos: 32490 },
    descontoPixPercentual: 5,
  });
  assert.match(texto, /^Olá, Ateliê Milena Kerbage!/);
  assert.match(texto, /1\) Kit berço Jardim rosê 9 peças \(cód\. MK-1001\)\n {3}Quantidade: 2\n {3}Cor: Rosê/);
  assert.match(texto, /Bordado: Com bordado do nome/);
  assert.match(texto, /A partir de R\$ 1\.490,00 cada \(R\$ 2\.980,00\)/);
  assert.match(texto, /2\) Manta de tricô trançada\n {3}Quantidade: 1\n {3}A partir de R\$ 269,00/);
  assert.match(texto, /Subtotal a partir de R\$ 3\.249,00/);
  assert.match(texto, /Cupom ENXOVAL10: -R\$ 324,90/);
  assert.match(texto, /Total estimado a partir de R\$ 2\.924,10, sem o frete/);
  assert.match(texto, /5% OFF/);
  assert.match(texto, /Nome: Ana Souza\nWhatsApp: \(85\) 99288-2282\nCidade\/UF ou CEP: Fortaleza\/CE\nPrefiro retirar no ateliê/);
  assert.match(texto, /Observações: Nome no bordado: Helena$/);
  assert.equal(reaisTexto(5), "R$ 0,05");
  assert.equal(reaisTexto(123456789), "R$ 1.234.567,89");
});

test("link do WhatsApp: só dígitos no número e texto codificado", () => {
  const link = linkWhatsApp("55 (85) 98582-2208", "Olá!\nPedido & cupom #1");
  assert.equal(link, "https://wa.me/5585985822208?text=Ol%C3%A1!%0APedido%20%26%20cupom%20%231");
  assert.equal(decodeURIComponent(new URL(link).searchParams.get("text") ?? ""), "Olá!\nPedido & cupom #1");
});
