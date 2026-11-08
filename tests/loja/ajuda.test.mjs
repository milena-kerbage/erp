import assert from "node:assert/strict";
import test from "node:test";
import { buscarPerguntas, hrefPergunta, normalizar, PERGUNTAS, TEMAS_AJUDA } from "../../src/loja/lib/ajuda/conteudo.ts";
import { linkCompartilharWhatsApp, linkIndicacao, mensagemIndicacao } from "../../src/loja/lib/indicacao.ts";

test("central de ajuda: ids únicos e toda pergunta num tema existente", () => {
  const ids = PERGUNTAS.map((pergunta) => pergunta.id);
  assert.equal(new Set(ids).size, ids.length);
  const temas = new Set(TEMAS_AJUDA.map((tema) => tema.slug));
  for (const pergunta of PERGUNTAS) assert.ok(temas.has(pergunta.tema), `${pergunta.id} → ${pergunta.tema}`);
  assert.equal(hrefPergunta(PERGUNTAS.find((pergunta) => pergunta.id === "retirada")), "/ajuda/entregas#retirada");
});

test("busca: sem acento, todas as palavras e acerto na pergunta primeiro", () => {
  assert.equal(normalizar("  Bordádo  NOME "), "bordado nome");
  assert.deepEqual(buscarPerguntas(""), []);
  assert.deepEqual(buscarPerguntas("a"), []);
  const frete = buscarPerguntas("frete");
  assert.ok(frete.length > 0);
  assert.equal(frete[0].id, "valor-frete"); // "frete" está na pergunta
  assert.ok(buscarPerguntas("bordádo").every((pergunta) => normalizar(`${pergunta.pergunta} ${pergunta.resposta}`).includes("bordado")));
  assert.deepEqual(
    buscarPerguntas("retirar fortaleza").map((pergunta) => pergunta.id).includes("retirada"),
    true,
  );
  assert.deepEqual(buscarPerguntas("xyzzy"), []);
});

test("nada de cashback nem pontos nas respostas da ajuda", () => {
  for (const pergunta of PERGUNTAS) assert.doesNotMatch(normalizar(`${pergunta.pergunta} ${pergunta.resposta}`), /cashback|programa de pontos|clube milena/);
});

test("indicação: link da loja com UTMs e WhatsApp sem número, com a mensagem codificada", () => {
  const link = linkIndicacao("https://www.ateliemilenakerbage.com.br", "whatsapp");
  assert.equal(link, "https://www.ateliemilenakerbage.com.br/?utm_source=indicacao&utm_medium=compartilhamento&utm_campaign=whatsapp");
  const texto = mensagemIndicacao(link);
  assert.match(texto, /Ateliê Milena Kerbage/);
  assert.ok(texto.endsWith(link));
  const whatsapp = linkCompartilharWhatsApp(texto);
  assert.ok(whatsapp.startsWith("https://wa.me/?text="));
  assert.equal(decodeURIComponent(new URL(whatsapp).searchParams.get("text") ?? ""), texto);
});
