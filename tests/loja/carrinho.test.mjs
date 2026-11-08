import assert from "node:assert/strict";
import test from "node:test";
import {
  CUPONS,
  calcularTotais,
  centavos,
  decimal,
  prazoDeProducao,
  textoPrazo,
  validarCupom,
} from "../../src/loja/lib/carrinho/totais.ts";

test("subtotal, Pix de 5% e parcelamento em centavos", () => {
  const t = calcularTotais([
    { preco: "119.00", quantidade: 3 }, // 357,00 (fraldas de boca)
    { preco: "140.70", quantidade: 1 }, // 140,70
  ]);
  assert.equal(t.itens, 4);
  assert.equal(t.subtotal, 49770);
  assert.equal(t.descontoPix, 2489); // 5% de 497,70 = 24,885 → 24,89
  assert.equal(t.totalPix, 47281);
  assert.equal(t.parcelas, 10);
  assert.equal(t.valorParcela, 4977);
  assert.equal(decimal(t.totalPix), "472.81");
});

test("cupom entra antes do Pix e respeita o mínimo", () => {
  const linhas = [{ preco: "219.90", quantidade: 5 }]; // 1.099,50 (5 almofadas de amamentação)
  const enxoval = CUPONS.find((c) => c.codigo === "ENXOVAL10");
  const t = calcularTotais(linhas, enxoval);
  assert.equal(t.descontoCupom, 10995);
  assert.equal(t.totalCartao, 98955);
  assert.equal(t.totalPix, 98955 - Math.round(98955 * 0.05));
  assert.equal(calcularTotais([{ preco: "119.00", quantidade: 1 }], enxoval).descontoCupom, 0); // abaixo do mínimo
});

test("validação de cupom: maiúsculas, espaços, inválido e mínimo", () => {
  assert.equal(validarCupom(" bemvindo5 ", 100).tipo, "ok");
  assert.equal(validarCupom("NAOEXISTE", 100000).tipo, "invalido");
  assert.equal(validarCupom("ENXOVAL10", 99999).tipo, "minimo");
  assert.equal(validarCupom("enxoval10", 100000).tipo, "ok");
});

test("carrinho vazio e parcela mínima", () => {
  const vazio = calcularTotais([]);
  assert.equal(vazio.totalPix, 0);
  assert.equal(vazio.parcelas, 1);
  assert.equal(calcularTotais([{ preco: "29.90", quantidade: 1 }]).parcelas, 1); // abaixo de R$ 40 não parcela
  assert.throws(() => centavos("29,90"));
});

test("Pix não desconta o frete (quando houver)", () => {
  const t = calcularTotais([{ preco: "100.00", quantidade: 1 }], undefined, 4190);
  assert.equal(t.descontoPix, 500); // 5% de R$ 100, sem o frete
  assert.equal(t.totalCartao, 14190);
  assert.equal(t.totalPix, 13690);
});

test("prazo de produção: vale o da peça mais demorada", () => {
  assert.deepEqual(prazoDeProducao([{ prontaEntrega: true }, { prontaEntrega: true }]), { min: 1, max: 2 });
  assert.deepEqual(prazoDeProducao([{ prontaEntrega: true }, { prontaEntrega: false }]), { min: 15, max: 25 });
  assert.equal(textoPrazo({ min: 2, max: 2 }), "2 dias úteis");
  assert.equal(textoPrazo({ min: 15, max: 25 }), "15 a 25 dias úteis");
});

test("editar item da sacola: troca no lugar, junta linhas iguais e separa com/sem bordado", async () => {
  const { editarItens } = await import("../../src/loja/componentes/carrinho/estado.ts");
  const a = { slug: "kit-a", variacao: "Berço padrão", quantidade: 1, personalizacao: "com" };
  const b = { slug: "kit-b", quantidade: 2 };
  const c = { slug: "kit-a", variacao: "Berço americano", quantidade: 3, personalizacao: "com" };

  // Troca o tamanho no mesmo lugar.
  assert.deepEqual(editarItens([a, b], a, { ...a, variacao: "Berço americano", quantidade: 2 }), [
    { slug: "kit-a", variacao: "Berço americano", quantidade: 2, personalizacao: "com" },
    b,
  ]);
  // A nova escolha já existe em outra linha: viram uma só, com as quantidades somadas.
  assert.deepEqual(editarItens([a, b, c], a, { ...a, variacao: "Berço americano" }), [b, { ...c, quantidade: 4 }]);
  // Com e sem bordado continuam linhas diferentes.
  assert.deepEqual(editarItens([a, c], a, { ...a, personalizacao: "sem" }), [{ ...a, personalizacao: "sem" }, c]);
  // Quantidade limitada a 1..999 e alvo inexistente não muda nada.
  assert.equal(editarItens([a], a, { ...a, quantidade: 5000 })[0].quantidade, 999);
  assert.deepEqual(editarItens([b], a, { ...a, quantidade: 2 }), [b]);
});

// Sacola única: produtos, projetos de quarto e o quartinho personalizado ("Monte o seu") juntos.

test("item da sacola: produto antigo continua igual; projeto e quartinho só com os campos do tipo", async () => {
  const { chaveItem, limparItem, mesmoItem } = await import("../../src/loja/lib/carrinho/item.ts");
  // Itens gravados antes dos projetos (sem tipo) continuam valendo, sem campos novos.
  assert.deepEqual(limparItem({ slug: "kit-a", variacao: "Berço padrão", quantidade: "2", personalizacao: "com", pacote: "x" }), {
    slug: "kit-a",
    variacao: "Berço padrão",
    quantidade: 2,
    personalizacao: "com",
  });
  assert.equal(limparItem({ quantidade: 1 }), null);
  assert.deepEqual(limparItem({ tipo: "projeto", slug: "ceu-de-algodao", pacote: "Premium", opcionais: ["kit-mini-cama", "paninhos", 3], quantidade: 0 }), {
    tipo: "projeto",
    slug: "ceu-de-algodao",
    quantidade: 1,
    pacote: "Essencial",
    opcionais: ["paninhos"], // o Céu de Algodão não tem kit mini cama
  });
  // Quartinho sem módulo válido é descartado; com módulo, o slug é o id do conjunto.
  assert.equal(limparItem({ tipo: "personalizado", slug: "q", quantidade: 1, quartinho: { modulos: [{ id: "x" }] } }), null);
  const quartinho = limparItem({ tipo: "personalizado", slug: "qualquer", quantidade: 1, quartinho: { tema: "neutro", modulos: [{ id: "manta" }] } });
  assert.match(quartinho.slug, /^quartinho-/);
  // Mesmo projeto com opcionais em outra ordem é a mesma linha; outro pacote, outra linha.
  const a = { tipo: "projeto", slug: "jardim-de-camomila", pacote: "Completo", opcionais: ["paninhos", "kit-mini-cama"] };
  assert.ok(mesmoItem(a, { ...a, opcionais: ["kit-mini-cama", "paninhos"] }));
  assert.ok(!mesmoItem(a, { ...a, pacote: "Essencial" }));
  assert.notEqual(chaveItem({ slug: "jardim-de-camomila" }), chaveItem({ tipo: "projeto", slug: "jardim-de-camomila" }));
});

test("editar projeto na sacola: troca pacote e opcionais no lugar e junta com a linha igual", async () => {
  const { editarItens } = await import("../../src/loja/componentes/carrinho/estado.ts");
  const produto = { slug: "kit-b", quantidade: 1 };
  const projeto = { tipo: "projeto", slug: "jardim-de-camomila", quantidade: 1, pacote: "Essencial" };
  const completo = { tipo: "projeto", slug: "jardim-de-camomila", quantidade: 2, pacote: "Completo", opcionais: ["paninhos"] };
  assert.deepEqual(editarItens([projeto, produto], projeto, { ...projeto, pacote: "Completo personalizado", opcionais: ["kit-mini-cama"] }), [
    { tipo: "projeto", slug: "jardim-de-camomila", quantidade: 1, pacote: "Completo personalizado", opcionais: ["kit-mini-cama"] },
    produto,
  ]);
  assert.deepEqual(editarItens([projeto, completo], projeto, { ...projeto, pacote: "Completo", opcionais: ["paninhos"] }), [{ ...completo, quantidade: 3 }]);
});

test("seleção antiga (mk_projetos) vira itens de projeto na sacola", async () => {
  const { itensDaSelecaoAntiga } = await import("../../src/loja/lib/carrinho/item.ts");
  assert.deepEqual(
    itensDaSelecaoAntiga([
      { slug: "nuvem-salvia", pacote: "Completo" },
      { slug: "nao-existe", pacote: "Completo" },
      { slug: "heranca-azul", pacote: "x" },
      "lixo",
    ]),
    [
      { tipo: "projeto", slug: "nuvem-salvia", quantidade: 1, pacote: "Completo" },
      { tipo: "projeto", slug: "heranca-azul", quantidade: 1, pacote: "Essencial" },
    ],
  );
  assert.deepEqual(itensDaSelecaoAntiga("lixo"), []);
});

test("linhas da sacola: projeto e quartinho com preço da escolha, atributos e prazo de projeto", async () => {
  const { atributosDoItem, resolverItem } = await import("../../src/loja/lib/carrinho/linhas.ts");
  const porSlug = new Map([["kit-a", { slug: "kit-a", sku: "MK-1", nome: "Kit A", preco: "1490.00", prontaEntrega: true, unidade: "peça", complementos: [], semelhantes: [] }]]);
  const projeto = resolverItem({ tipo: "projeto", slug: "jardim-de-camomila", quantidade: 1, pacote: "Completo", opcionais: ["paninhos"] }, porSlug);
  assert.equal(projeto.preco, "5390.00"); // 3.900 + 1.200 (Completo) + 290 (paninhos)
  assert.equal(projeto.href, "/personalizado/jardim-de-camomila");
  assert.deepEqual(projeto.atributos, ["Pacote: Completo", "Opcionais: Paninhos", "Paleta: Linho cru, Amarelo-manteiga, Verde-sálvia"]);
  assert.deepEqual(projeto.producao, { min: 20, max: 35 });
  assert.equal(projeto.paleta.length, 3);
  assert.equal(resolverItem({ tipo: "projeto", slug: "nao-existe", quantidade: 1 }, porSlug), undefined);
  assert.equal(resolverItem({ slug: "kit-a", quantidade: 1 }, porSlug).nome, "Kit A");

  const quartinho = {
    tema: "menino",
    paleta: "ceu-de-algodao",
    tamanhoBerco: "Berço padrão · 60 × 130 cm",
    modulos: [
      { id: "kit-berco", opcoes: { pecas: "9 peças", tecido: "Tricoline" } },
      { id: "cortina", opcoes: {} },
    ],
    bordado: "Theo",
  };
  const personalizado = resolverItem({ tipo: "personalizado", slug: "quartinho-x", quantidade: 1, quartinho }, porSlug);
  assert.equal(personalizado.preco, "2070.00"); // 1.290 + 690 + 90 (bordado)
  assert.equal(personalizado.nome, "Meu quartinho personalizado · Céu de Algodão");
  assert.match(personalizado.href, /^\/personalizado\/monte-o-seu\/resumo\?editar=quartinho-x$/);
  const atributos = atributosDoItem(personalizado, {});
  assert.ok(atributos.includes("Tamanho do berço: Berço padrão · 60 × 130 cm"));
  assert.ok(atributos.includes("Bordado do nome: Theo"));
  assert.equal(atributos.at(-1), "3 itens: Kit berço, Cortina, Bordado do nome");
});

test("totais a partir de com produto + projeto + quartinho, e o prazo de produção do projeto", async () => {
  const { resolverItem } = await import("../../src/loja/lib/carrinho/linhas.ts");
  const porSlug = new Map([["kit-a", { slug: "kit-a", nome: "Kit A", preco: "119.00", prontaEntrega: true }]]);
  const itens = [
    { slug: "kit-a", quantidade: 2 },
    { tipo: "projeto", slug: "primavera-delicada", quantidade: 1, pacote: "Essencial" },
    { tipo: "personalizado", slug: "q", quantidade: 1, quartinho: { modulos: [{ id: "manta" }] } },
  ];
  const linhas = itens.map((item) => ({ item, produto: resolverItem(item, porSlug) }));
  const totais = calcularTotais(linhas.map(({ item, produto }) => ({ preco: produto.preco, quantidade: item.quantidade })));
  assert.equal(totais.itens, 4);
  assert.equal(totais.subtotal, 2 * 11900 + 190000 + 26900);
  assert.deepEqual(prazoDeProducao(linhas.map(({ produto }) => produto)), { min: 20, max: 35 });
  assert.deepEqual(prazoDeProducao([{ prontaEntrega: true }, { prontaEntrega: false }, { prontaEntrega: false, producao: { min: 20, max: 35 } }]), { min: 20, max: 35 });
});

test("mensagem do pedido com produto, projeto e quartinho: pacote, opcionais e módulos com valores", async () => {
  const { linhaDoPedido, resolverItem } = await import("../../src/loja/lib/carrinho/linhas.ts");
  const { montarMensagemPedido } = await import("../../src/loja/lib/checkout/pedido.ts");
  const porSlug = new Map([["kit-a", { slug: "kit-a", sku: "MK-1001", nome: "Kit A", preco: "1490.00", unidade: "peça", cor: "Rosê" }]]);
  const itens = [
    { slug: "kit-a", quantidade: 1, variacao: "Berço padrão" },
    { tipo: "projeto", slug: "jardim-de-camomila", quantidade: 1, pacote: "Completo", opcionais: ["kit-mini-cama"] },
    {
      tipo: "personalizado",
      slug: "q",
      quantidade: 2,
      quartinho: { tema: "neutro", paleta: "nuvem-salvia", tamanhoBerco: "Berço americano · 70 × 130 cm", modulos: [{ id: "kit-berco", opcoes: {} }, { id: "tapete", opcoes: { tamanho: "Redondo 1,40 m" } }] },
    },
  ];
  const linhas = itens.map((item) => linhaDoPedido(item, resolverItem(item, porSlug)));
  const texto = montarMensagemPedido({
    linhas,
    cliente: { nome: "Ana Souza", whatsapp: "(85) 99288-2282", local: "", retirar: false, observacoes: "" },
    descontoPixPercentual: 5,
  });
  assert.match(texto, /1\) Kit A \(cód\. MK-1001\)\n {3}Quantidade: 1\n {3}Cor: Rosê/);
  assert.match(texto, /2\) Quartinho Jardim de Camomila\n {3}Quantidade: 1\n {3}Pacote: Completo\n {3}Opcionais: Kit mini cama\n/);
  assert.match(texto, / {3}O que vem:\n {3}- Pacote Completo \(.*\): a partir de R\$ 5\.100,00\n {3}- Kit mini cama \(.*\): a partir de R\$ 790,00\n {3}A partir de R\$ 5\.890,00/);
  assert.match(texto, /3\) Meu quartinho personalizado · Nuvem Sálvia \[montado no site\]\n {3}Quantidade: 2\n {3}Tema: Neutro/);
  assert.match(texto, / {3}Tamanho do berço: Berço americano · 70 × 130 cm/);
  assert.match(texto, / {3}Peças escolhidas:\n {3}- Kit berço \(7 peças · Tricoline\): a partir de R\$ 990,00\n {3}- Tapete \(Redondo 1,40 m\): a partir de R\$ 700,00/);
  assert.match(texto, /A partir de R\$ 1\.690,00 cada \(R\$ 3\.380,00\)/);
  assert.match(texto, /Subtotal a partir de R\$ 10\.760,00/); // 1.490 + 5.890 + 2 × 1.690
  assert.match(texto, /Vi que no Pix tem 5% OFF\./);
  assert.match(texto, /produção de 20 a 35 dias úteis/);
  assert.doesNotMatch(texto, /cashback|seleção/i);
});
