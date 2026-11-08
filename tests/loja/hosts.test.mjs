import assert from "node:assert/strict";
import { test } from "node:test";
import { ehHostDaLoja, hostsDaLoja, nomeDoHost, regexHostsDaLoja } from "../../src/lib/hosts.ts";

test("domínio principal e www abrem a loja; erp. e demais hosts abrem o ERP", () => {
  const ambiente = {};
  assert.equal(ehHostDaLoja("ateliemilenakerbage.com.br", ambiente), true);
  assert.equal(ehHostDaLoja("www.ateliemilenakerbage.com.br", ambiente), true);
  assert.equal(ehHostDaLoja("WWW.AteliemilenaKerbage.com.br:443", ambiente), true);
  assert.equal(ehHostDaLoja("www.localhost:3000", ambiente), true);
  assert.equal(ehHostDaLoja("erp.ateliemilenakerbage.com.br", ambiente), false);
  assert.equal(ehHostDaLoja("localhost:3000", ambiente), false);
  assert.equal(ehHostDaLoja("127.0.0.1:3000", ambiente), false);
  assert.equal(ehHostDaLoja("projeto-abc.vercel.app", ambiente), false);
  assert.equal(ehHostDaLoja(null, ambiente), false);
  assert.equal(ehHostDaLoja("", ambiente), false);
});

test("LOJA_HOSTS acrescenta hosts sem duplicar", () => {
  const ambiente = { LOJA_HOSTS: " loja-previa.vercel.app , www.localhost ," };
  assert.equal(ehHostDaLoja("loja-previa.vercel.app", ambiente), true);
  assert.equal(hostsDaLoja(ambiente).filter((host) => host === "www.localhost").length, 1);
});

test("nome do host ignora porta e caixa", () => {
  assert.equal(nomeDoHost("Erp.Exemplo.com:8080"), "erp.exemplo.com");
  assert.equal(nomeDoHost(undefined), "");
});

test("regex do next.config casa só os hosts da loja, com pontos escapados", () => {
  const regex = new RegExp(regexHostsDaLoja({}));
  assert.equal(regex.test("www.ateliemilenakerbage.com.br"), true);
  assert.equal(regex.test("ateliemilenakerbage.com.br"), true);
  assert.equal(regex.test("erp.ateliemilenakerbage.com.br"), false);
  assert.equal(regex.test("wwwXateliemilenakerbage.com.br"), false);
});
