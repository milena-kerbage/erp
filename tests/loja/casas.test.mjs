// Área Personalizado (quartinhos de bebê completos, antiga "Projetos"): catálogo, filtros, pacotes, opcionais e propagandas. O
// pedido do projeto vai pela sacola (tests/loja/carrinho.test.mjs) e o montador tem o próprio teste
// (tests/loja/montador.test.mjs).
// O arquivo mantém o nome "casas" porque os módulos ainda vivem em src/loja/lib/casas.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  AVISO_PRECOS,
  buscarColecao,
  buscarProjeto,
  caminhoFoto,
  formatarPreco,
  fotosDoProjeto,
  listarColecoes,
  listarProjetos,
  nomeCurto,
  OPCIONAIS,
  opcionaisValidos,
  PACOTES,
  pacoteValido,
  precoDoPacote,
  precoDoProjeto,
  projetosEmDestaque,
  variacaoProjeto,
} from "../../src/loja/lib/casas/catalogo.ts";
import {
  alternarFiltro,
  filtrarProjetos,
  filtrosAtivos,
  gruposDeFiltro,
  limparFiltros,
  ordenarProjetos,
  ORDENACOES_PROJETOS,
  valorDoFiltro,
} from "../../src/loja/lib/casas/filtragem.ts";
import { ORDENS, slug } from "../../src/loja/lib/seo/urls.ts";

const projetos = [
  { slug: "a", tema: "menina", estilo: "floral", tecido: "linho", precoAPartirDe: 3900, prazoDiasUteis: 30 },
  { slug: "b", tema: "menina", estilo: "classico", tecido: "percal", precoAPartirDe: 1900, prazoDiasUteis: 20 },
  { slug: "c", tema: "menino", estilo: "safari", tecido: "linho", precoAPartirDe: 2700, prazoDiasUteis: 25 },
  { slug: "d", tema: "neutro", estilo: "nuvens", tecido: "tricoline", precoAPartirDe: 2700, prazoDiasUteis: 22 },
  { slug: "e", tema: "neutro", estilo: "floral", tecido: "linho", precoAPartirDe: 7500, prazoDiasUteis: 35 },
];
const slugs = (lista) => lista.map((projeto) => projeto.slug);
const semEspacoDuro = (texto) => texto.replace(/\s/g, " ");

test("valor de cada filtro", () => {
  assert.equal(valorDoFiltro(projetos[0], "tema"), "menina");
  assert.equal(valorDoFiltro(projetos[2], "estilo"), "safari");
  assert.equal(valorDoFiltro(projetos[3], "tecido"), "tricoline");
  assert.equal(valorDoFiltro(projetos[0], "inexistente"), undefined);
});

test("filtrar: OU dentro do filtro, E entre filtros", () => {
  assert.deepEqual(slugs(filtrarProjetos(projetos, { tema: ["menina"] })), ["a", "b"]);
  assert.deepEqual(slugs(filtrarProjetos(projetos, { estilo: ["floral", "safari"] })), ["a", "c", "e"]);
  assert.deepEqual(slugs(filtrarProjetos(projetos, { estilo: ["floral"], tema: ["neutro"] })), ["e"]);
  assert.deepEqual(slugs(filtrarProjetos(projetos, {})), ["a", "b", "c", "d", "e"]);
  assert.deepEqual(slugs(filtrarProjetos(projetos, { cor: ["azul"] })), ["a", "b", "c", "d", "e"]); // filtro desconhecido é ignorado
  assert.deepEqual(filtrarProjetos(projetos, { tema: ["outro"] }), []);
});

test("grupos: contagem ignora a própria seleção, ordem do menu e grupo de opção única some", () => {
  const grupos = gruposDeFiltro(projetos, { tema: ["menina"] });
  const tema = grupos.find((grupo) => grupo.chave === "tema");
  assert.deepEqual(
    tema.opcoes.map((opcao) => [opcao.valor, opcao.total, opcao.ativo]),
    [
      ["menina", 2, true],
      ["menino", 1, false],
      ["neutro", 2, false],
    ],
  );
  const estilo = grupos.find((grupo) => grupo.chave === "estilo");
  assert.deepEqual(
    estilo.opcoes.map((opcao) => [opcao.valor, opcao.total]),
    [
      ["floral", 1],
      ["safari", 0],
      ["nuvens", 0],
      ["classico", 1],
    ],
  );
  assert.equal(estilo.opcoes[1].rotulo, "Safári");
  const soLinho = projetos.filter((projeto) => projeto.tecido === "linho");
  assert.equal(
    gruposDeFiltro(soLinho, {}).some((grupo) => grupo.chave === "tecido"),
    false,
  );
});

test("alternar e limpar filtros", () => {
  const original = { tema: ["menino"] };
  assert.deepEqual(alternarFiltro(original, "tema", "menina"), { tema: ["menina", "menino"] });
  assert.deepEqual(alternarFiltro(original, "tema", "menino"), {});
  assert.deepEqual(alternarFiltro(original, "estilo", "floral"), { tema: ["menino"], estilo: ["floral"] });
  assert.deepEqual(original, { tema: ["menino"] }); // não altera o objeto recebido
  assert.deepEqual(limparFiltros(projetos, { tema: ["neutro", "menina", "menina", "x"], cor: ["azul"], estilo: [] }), {
    tema: ["menina", "neutro"],
  });
  assert.deepEqual(
    filtrosAtivos({ estilo: ["nuvens"], tema: ["menina"] }).map((filtro) => filtro.rotulo),
    ["Para menina", "Nuvens e céu"],
  );
});

test("ordenar: destaque e preço (empate pelo menor prazo); ordens aceitas pelo motor de URLs", () => {
  assert.deepEqual(slugs(ordenarProjetos(projetos, "relevancia")), ["a", "b", "c", "d", "e"]);
  assert.deepEqual(slugs(ordenarProjetos(projetos, "menor-preco")), ["b", "d", "c", "a", "e"]);
  assert.deepEqual(slugs(ordenarProjetos(projetos, "maior-preco")), ["e", "a", "d", "c", "b"]);
  for (const opcao of ORDENACOES_PROJETOS) assert.ok(ORDENS.includes(opcao.valor), opcao.valor);
});

test("filtros da query estão em REGRAS_SEO.parametrosFiltro (senão o proxy os tira da URL)", () => {
  const config = readFileSync(new URL("../../src/loja/lib/seo/config.ts", import.meta.url), "utf8");
  const parametros = /parametrosFiltro:\s*\[([^\]]*)\]/.exec(config)?.[1] ?? "";
  for (const chave of ["tema", "estilo", "tecido"]) assert.ok(parametros.includes(`"${chave}"`), chave);
});

test("valores dos filtros já estão na forma do slug() do motor de URLs", () => {
  for (const grupo of gruposDeFiltro(listarProjetos(), {})) {
    for (const opcao of grupo.opcoes) assert.equal(slug(opcao.valor), opcao.valor, `${grupo.chave}=${opcao.valor}`);
  }
});

test("catálogo: 10 a 14 quartinhos do ateliê, slugs únicos, dados completos e preços na faixa", () => {
  const lista = listarProjetos();
  assert.ok(lista.length >= 10 && lista.length <= 14, String(lista.length));
  assert.equal(new Set(lista.map((projeto) => projeto.slug)).size, lista.length);
  assert.equal(buscarProjeto("nuvem-salvia")?.nome, "Quartinho Nuvem Sálvia");
  assert.equal(buscarProjeto("nao-existe"), null);
  assert.ok(projetosEmDestaque().length >= 3);
  for (const projeto of lista) {
    assert.equal(slug(projeto.slug), projeto.slug);
    assert.ok(projeto.nome.startsWith("Quartinho "), projeto.nome);
    assert.ok(projeto.precoAPartirDe >= 1900 && projeto.precoAPartirDe <= 7500, projeto.slug);
    assert.ok(projeto.prazoDiasUteis >= 20 && projeto.prazoDiasUteis <= 35, projeto.slug);
    assert.ok(projeto.descricao.length >= 1 && projeto.pecas.length >= 3, projeto.slug);
    assert.ok(projeto.paleta.length >= 2, projeto.slug);
    for (const cor of projeto.paleta) assert.match(cor.hex, /^#[0-9A-F]{6}$/i, `${projeto.slug}: ${cor.nome}`);
    // Sem fotos por enquanto: a galeria usa o placeholder. Quando houver, o caminho é este.
    assert.equal(fotosDoProjeto(projeto).length, projeto.fotos);
  }
  assert.equal(caminhoFoto("nuvem-salvia", "foto-1"), "/vitrine/projetos/nuvem-salvia/foto-1.webp");
});

test("cada página de seleção do menu tem projetos", () => {
  for (const colecao of listarColecoes().filter((item) => item.tipo === "selecao")) {
    assert.ok(filtrarProjetos(listarProjetos(), colecao.filtros).length >= 2, colecao.slug);
  }
});

test("coleções batem com o menu e não colidem com projetos", () => {
  const navegacao = readFileSync(new URL("../../src/loja/componentes/layout/cabecalho/navegacao.ts", import.meta.url), "utf8");
  const doMenu = [...navegacao.matchAll(/href: "\/personalizado\/([^"?/]+)"/g)].map(([, caminho]) => caminho);
  assert.ok(doMenu.length >= 9, doMenu.join(","));
  assert.doesNotMatch(navegacao, /"\/projetos/);
  // Rota própria ao lado de /personalizado/[slug]: o montador (e "selecao", que é só redirecionamento
  // do endereço antigo, não pode virar coleção nem quartinho).
  const ROTAS_PROPRIAS = ["monte-o-seu", "selecao"];
  for (const caminho of doMenu.filter((item) => !ROTAS_PROPRIAS.includes(item))) assert.ok(buscarColecao(caminho), `/personalizado/${caminho} sem página`);
  for (const colecao of listarColecoes()) assert.equal(buscarProjeto(colecao.slug), null, colecao.slug);
  for (const rota of ROTAS_PROPRIAS) {
    assert.equal(buscarColecao(rota), null, rota);
    assert.equal(buscarProjeto(rota), null, rota);
  }
  const rotas = new URL("../../src/app/(site)/loja/(vitrine)/personalizado/", import.meta.url);
  assert.ok(readFileSync(new URL("monte-o-seu/layout.tsx", rotas), "utf8").includes("<Montador"));
  assert.ok(readFileSync(new URL("monte-o-seu/[etapa]/page.tsx", rotas), "utf8").includes("EtapaDoMontador"));
  assert.deepEqual(buscarColecao("floral")?.filtros, { estilo: ["floral"] });
});

test("pacotes e preço por pacote", () => {
  assert.deepEqual(
    PACOTES.map((pacote) => pacote.nome),
    ["Essencial", "Completo", "Completo personalizado"],
  );
  const projeto = buscarProjeto("primavera-delicada");
  assert.equal(precoDoPacote(projeto, "Essencial"), projeto.precoAPartirDe);
  assert.ok(precoDoPacote(projeto, "Completo") > precoDoPacote(projeto, "Essencial"));
  assert.ok(precoDoPacote(projeto, "Completo personalizado") > precoDoPacote(projeto, "Completo"));
  assert.equal(semEspacoDuro(formatarPreco(3900)), "R$ 3.900");
  assert.match(AVISO_PRECOS, /fictícios/);
});

test("opcionais e preço da escolha (pacote + opcionais), variação do título e nome curto", () => {
  assert.deepEqual(
    OPCIONAIS.map((opcional) => opcional.id),
    ["kit-mini-cama", "paninhos"],
  );
  for (const projeto of listarProjetos()) {
    for (const id of projeto.opcionais) assert.ok(OPCIONAIS.some((opcional) => opcional.id === id), `${projeto.slug}: ${id}`);
  }
  const jardim = buscarProjeto("jardim-de-camomila");
  assert.equal(precoDoProjeto(jardim, "Essencial"), 3900);
  assert.equal(precoDoProjeto(jardim, "Completo", ["paninhos"]), 3900 + 1200 + 290);
  assert.equal(precoDoProjeto(jardim, "Completo", ["paninhos", "kit-mini-cama", "x"]), 3900 + 1200 + 290 + 790);
  // Opcional que o projeto não oferece não entra (Céu de Algodão não tem kit mini cama).
  const ceu = buscarProjeto("ceu-de-algodao");
  assert.deepEqual(opcionaisValidos(ceu, ["kit-mini-cama", "paninhos", "paninhos"]), ["paninhos"]);
  assert.equal(precoDoProjeto(ceu, "Essencial", ["kit-mini-cama"]), ceu.precoAPartirDe);
  assert.equal(pacoteValido("Completo"), "Completo");
  assert.equal(pacoteValido("Premium"), "Essencial");
  assert.equal(pacoteValido(undefined), "Essencial");
  assert.equal(variacaoProjeto(jardim), "Floral · Menina");
  assert.equal(variacaoProjeto(buscarProjeto("nuvem-salvia")), "Nuvens e céu · Neutro");
  assert.equal(nomeCurto(jardim), "Jardim de Camomila");
});

test("propagandas: dados completos, link dentro de /personalizado e números batem com o catálogo", async () => {
  const { PROPAGANDAS_PROJETOS, CATEGORIAS_PROPAGANDAS_PROJETOS } = await import("../../src/loja/lib/casas/propagandas.ts");
  assert.ok(PROPAGANDAS_PROJETOS.length >= 2 && PROPAGANDAS_PROJETOS.length <= 3);
  assert.deepEqual([...CATEGORIAS_PROPAGANDAS_PROJETOS], ["kit-berco", "quarto"]);
  assert.ok(PROPAGANDAS_PROJETOS[0].apoio.includes(`${listarProjetos().length} quartinhos`));
  const navegacao = readFileSync(new URL("../../src/loja/componentes/layout/cabecalho/navegacao.ts", import.meta.url), "utf8");
  for (const propaganda of PROPAGANDAS_PROJETOS) {
    for (const campo of ["titulo", "apoio", "acao", "href", "alt"]) assert.ok(propaganda[campo], `${campo} vazio`);
    assert.ok(propaganda.href.startsWith("/personalizado"), propaganda.href);
    assert.ok(navegacao.includes(`href: "${propaganda.href}"`), `${propaganda.href} fora do menu`);
  }
  for (const raiz of CATEGORIAS_PROPAGANDAS_PROJETOS) assert.ok(navegacao.includes(`href: "/${raiz}"`), raiz);
});

test("sem resto de casas, vestidos ou da marca antiga nos dados", () => {
  const arquivos = ["catalogo.ts", "filtragem.ts", "propagandas.ts", "modulos.ts"].map((nome) =>
    readFileSync(new URL(`../../src/loja/lib/casas/${nome}`, import.meta.url), "utf8"),
  );
  const proibido = /steel|fast|m²|obra\b|franquia|terreno|vestido|noiva|madrinha|debutante|\bprova\b/i;
  for (const texto of arquivos) assert.doesNotMatch(texto.replace(/src\/loja\/lib\/casas/g, ""), proibido);
});

test("o fluxo separado de seleção saiu: sem mk_projetos fora da migração e sem os componentes antigos", () => {
  const casas = new URL("../../src/loja/componentes/casas/", import.meta.url);
  for (const antigo of ["SelecaoProjetos.tsx", "FormularioPedido.tsx", "estadoSelecao.ts", "AvisoCarrinhoCasas.tsx", "SeletorPacote.tsx"]) {
    assert.throws(() => readFileSync(new URL(antigo, casas)), { code: "ENOENT" }, antigo);
  }
  const estado = readFileSync(new URL("../../src/loja/componentes/carrinho/estado.ts", import.meta.url), "utf8");
  assert.match(estado, /migrarSelecaoAntiga/);
});
