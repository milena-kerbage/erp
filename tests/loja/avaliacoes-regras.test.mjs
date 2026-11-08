import assert from "node:assert/strict";
import test from "node:test";
import {
  filtrosDaUrl,
  formatarNota,
  LIMITES_AVALIACAO,
  limparTexto,
  normalizarBusca,
  parametrosDosFiltros,
  problemaDaFoto,
  validarAvaliacao,
} from "../../src/loja/lib/avaliacoes/regras.ts";

const valida = {
  produto: "kit-berco-classico",
  nota: "4",
  titulo: "  Muito   lindo ",
  texto: "Chegou rápido e o bordado ficou perfeito.\r\n\r\n\r\n\r\nRecomendo!",
  nome: "Ana",
  cidade: "Fortaleza/CE",
  paraQuem: "surpresa",
  consentimento: "true",
};

test("validarAvaliacao limpa os textos e aceita os campos opcionais vazios", () => {
  const resultado = validarAvaliacao(valida);
  assert.equal(resultado.ok, true);
  assert.equal(resultado.dados.titulo, "Muito lindo");
  assert.equal(resultado.dados.texto, "Chegou rápido e o bordado ficou perfeito.\n\nRecomendo!");
  assert.equal(resultado.dados.nota, 4);
  assert.equal(validarAvaliacao({ ...valida, cidade: "", paraQuem: "" }).ok, true);
  assert.equal(validarAvaliacao({ ...valida, cidade: "São Paulo, SP" }).ok, true);
});

test("validarAvaliacao aponta cada campo inválido", () => {
  const resultado = validarAvaliacao({ produto: "../etc", nota: "0", titulo: "", texto: "curto", nome: "a@b.com", cidade: "<script>", paraQuem: "gato" });
  assert.equal(resultado.ok, false);
  assert.deepEqual(Object.keys(resultado.erros).sort(), ["cidade", "consentimento", "nome", "nota", "paraQuem", "produto", "texto", "titulo"]);
  assert.equal(validarAvaliacao({ ...valida, texto: "x".repeat(LIMITES_AVALIACAO.textoMaximo + 1) }).ok, false);
  assert.equal(validarAvaliacao({ ...valida, nome: "n".repeat(LIMITES_AVALIACAO.nome + 1) }).ok, false);
  assert.equal(validarAvaliacao({ ...valida, texto: "Veja mais em https://exemplo.com.br agora mesmo" }).ok, false);
  assert.equal(validarAvaliacao({ ...valida, nota: "4.5" }).ok, false);
});

test("problemaDaFoto confere tipo e 3 MB no navegador", () => {
  assert.equal(problemaDaFoto({ size: 1000, type: "image/jpeg" }), null);
  assert.match(problemaDaFoto({ size: 1000, type: "image/gif", name: "a.gif" }), /não é JPEG, PNG ou WebP/);
  assert.match(problemaDaFoto({ size: LIMITES_AVALIACAO.fotoBytes + 1, type: "image/png" }), /mais de 3 MB/);
  assert.equal(problemaDaFoto({ size: LIMITES_AVALIACAO.fotoBytes, type: "image/webp" }), null);
});

test("filtros da URL têm valores seguros e voltam para a URL", () => {
  const filtros = filtrosDaUrl(new URLSearchParams("ordem=maior&nota=5,4,9,4&fotos=1&para=menina,gato&busca=%20bebê%20&offset=-3&limite=999"));
  assert.deepEqual(filtros, { ordem: "maior", notas: [5, 4], comFotos: true, paraQuem: ["menina"], busca: "bebê", offset: 0, limite: LIMITES_AVALIACAO.porPagina });
  assert.equal(filtrosDaUrl(new URLSearchParams("ordem=DROP")).ordem, "recentes");
  assert.equal(parametrosDosFiltros("kit", { ...filtros, offset: 6 }).toString(), "produto=kit&ordem=maior&nota=5%2C4&fotos=1&para=menina&busca=beb%C3%AA&offset=6");
});

test("normalização da busca e formatação", () => {
  assert.equal(normalizarBusca("  Bebê  ÇÃO "), "bebe cao");
  assert.equal(limparTexto("a​\u0007b"), "ab");
  assert.equal(formatarNota(4.25), "4.3".replace(".", ","));
});
