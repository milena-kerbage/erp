// node --test tests/   (Node 24 executa .ts direto, sem build)
import assert from "node:assert/strict";
import test from "node:test";
import {
  COOKIE,
  desserializar,
  escreverConsentimento,
  extrairToque,
  planejarCookies,
  renovarSessao,
  serializar,
  VALIDADE,
} from "../../src/loja/lib/rastreamento/nucleo.ts";

const AGORA_MS = Date.UTC(2026, 10, 2, 15, 0, 0);
const AGORA = Math.floor(AGORA_MS / 1000);
const LOJA = "https://www.ateliemilenakerbage.com.br";
let contador = 0;
const gerarId = () => `id-${++contador}`;

function planejar({ caminho = "/", referer = null, cookies = {}, userAgent = "Mozilla/5.0 Safari", agoraMs = AGORA_MS } = {}) {
  return planejarCookies({ url: LOJA + caminho, referer, userAgent, cookies, agoraMs, gerarId });
}
const cookie = (plano, nome) => plano.definir.find((c) => c.nome === nome);
const atribuicaoDe = (plano) => desserializar(cookie(plano, COOKIE.atribuicao)?.valor);
const TUDO = { [COOKIE.consentimento]: escreverConsentimento({ analitico: true, marketing: true }) };
const NADA = { [COOKIE.consentimento]: escreverConsentimento({ analitico: false, marketing: false }) };

test("UTMs viram o toque com origem, meio e campanha", () => {
  const t = extrairToque(new URL(`${LOJA}/kit-berco?utm_source=Google&utm_medium=CPC&utm_campaign=bf-2026&utm_content=banner`), null, AGORA);
  assert.equal(t.origem, "google");
  assert.equal(t.meio, "cpc");
  assert.equal(t.parametros.utm_campaign, "bf-2026");
  assert.equal(t.parametros.utm_content, "banner");
  assert.equal(t.pagina, "/kit-berco");
});

test("ID de clique sem UTM deduz a plataforma e preserva maiúsculas", () => {
  const t = extrairToque(new URL(`${LOJA}/?gclid=Cj0KCQiAx_AbC`), null, AGORA);
  assert.deepEqual([t.origem, t.meio], ["google", "cpc"]);
  assert.equal(t.ids.gclid, "Cj0KCQiAx_AbC");
});

test("referrer classifica orgânico, social, IA e referral; interno e pagamento são ignorados", () => {
  const meio = (ref) => extrairToque(new URL(`${LOJA}/`), ref, AGORA)?.meio;
  assert.equal(meio("https://www.google.com.br/"), "organic");
  assert.equal(meio("https://l.instagram.com/"), "social");
  assert.equal(meio("https://chatgpt.com/"), "ai-assistant");
  assert.equal(meio("https://blogdamamae.com.br/post"), "referral");
  assert.equal(meio("https://www.ateliemilenakerbage.com.br/carrinho"), undefined);
  assert.equal(meio("https://www.mercadopago.com.br/checkout"), undefined);
});

test("primeiro toque é preservado e último toque ignora visita direta", () => {
  const p1 = planejar({ caminho: "/?utm_source=meta&utm_medium=paid", cookies: TUDO });
  const atrib1 = cookie(p1, COOKIE.atribuicao).valor;
  const p2 = planejar({ caminho: "/produto/x", cookies: { ...TUDO, [COOKIE.atribuicao]: atrib1 } });
  assert.equal(atribuicaoDe(p2).ultimo.origem, "meta"); // direto não sobrescreve
  const p3 = planejar({ caminho: "/", referer: "https://www.bing.com/", cookies: { ...TUDO, [COOKIE.atribuicao]: atrib1 } });
  const a3 = atribuicaoDe(p3);
  assert.equal(a3.primeiro.origem, "meta");
  assert.deepEqual([a3.ultimo.origem, a3.ultimo.meio], ["www.bing.com", "organic"]);
  assert.equal(a3.toques, 2);
});

test("sem decisão de consentimento: atribuição só na sessão do navegador, sem visitante nem Meta", () => {
  const p = planejar({ caminho: "/?fbclid=AbC123&utm_source=ig" });
  const atrib = cookie(p, COOKIE.atribuicao);
  assert.equal(atrib.maxAge, undefined); // cookie de sessão
  assert.equal(atrib.httpOnly, true);
  assert.equal(atribuicaoDe(p).ultimo.ids.fbclid, "AbC123"); // guardado enquanto decide
  assert.equal(cookie(p, COOKIE.visitante), undefined);
  assert.equal(cookie(p, COOKIE.metaClique), undefined);
});

test("recusou marketing: IDs de clique e cookies da Meta são apagados", () => {
  const anterior = planejar({ caminho: "/?gclid=XyZ&utm_source=google" });
  const p = planejar({
    caminho: "/?ttclid=T1",
    cookies: { ...NADA, [COOKIE.atribuicao]: cookie(anterior, COOKIE.atribuicao).valor, _fbc: "fb.1.1.a", [COOKIE.visitante]: "v" },
  });
  const a = atribuicaoDe(p);
  assert.deepEqual(a.primeiro.ids, {});
  assert.deepEqual(a.ultimo.ids, {});
  assert.equal(a.primeiro.parametros.utm_source, "google"); // campanha (não pessoal) continua
  assert.ok(p.apagar.includes(COOKIE.metaClique));
  assert.ok(p.apagar.includes(COOKIE.visitante));
});

test("aceitou tudo: cookies persistentes, visitante, sessão e _fbc/_fbp no formato da Meta", () => {
  const p = planejar({ caminho: "/?fbclid=AbC123", cookies: TUDO });
  assert.equal(cookie(p, COOKIE.atribuicao).maxAge, VALIDADE.atribuicao);
  assert.ok(cookie(p, COOKIE.visitante));
  assert.match(cookie(p, COOKIE.sessao).valor, /^id-\d+\.\d+\.\d+$/);
  const fbc = cookie(p, COOKIE.metaClique);
  assert.equal(fbc.valor, `fb.1.${AGORA_MS}.AbC123`);
  assert.equal(fbc.httpOnly, false); // o Pixel precisa ler
  assert.match(cookie(p, COOKIE.metaNavegador).valor, /^fb\.1\.\d{13}\.\d{10}$/);
});

test("_fbc só é regravado quando o fbclid muda", () => {
  const cookies = { ...TUDO, _fbc: "fb.1.123.AbC123", _fbp: "fb.1.123.1234567890" };
  assert.equal(cookie(planejar({ caminho: "/?fbclid=AbC123", cookies }), COOKIE.metaClique), undefined);
  assert.ok(cookie(planejar({ caminho: "/?fbclid=Novo9", cookies }), COOKIE.metaClique));
});

test("sessão expira após 30 min ou nova campanha; senão desliza", () => {
  const ativa = `s1.${AGORA - 600}.${AGORA - 600}`;
  assert.equal(renovarSessao(ativa, AGORA, false, gerarId), `s1.${AGORA - 600}.${AGORA}`);
  assert.notEqual(renovarSessao(`s1.${AGORA - 4000}.${AGORA - 1900}`, AGORA, false, gerarId).split(".")[0], "s1");
  assert.notEqual(renovarSessao(ativa, AGORA, true, gerarId).split(".")[0], "s1");
});

test("bots não recebem cookies", () => {
  const p = planejar({ caminho: "/?utm_source=x", userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1)" });
  assert.deepEqual(p, { definir: [], apagar: [] });
});

test("valores são limpos, limitados e o cookie nunca passa do limite", () => {
  const enorme = "a".repeat(5000);
  const t = extrairToque(new URL(`${LOJA}/?utm_campaign=${enorme}&ttclid=${"b".repeat(1001)}&gclid=ok%0A`), null, AGORA);
  assert.equal(t.parametros.utm_campaign.length, 200);
  assert.equal(t.ids.ttclid, undefined); // acima do máximo: descartado, nunca truncado
  assert.equal(t.ids.gclid, "ok");
  const grande = planejar({
    caminho: `/?${Object.entries({
      utm_source: enorme,
      utm_medium: enorme,
      utm_campaign: enorme,
      utm_content: enorme,
      utm_term: enorme,
      gclid: "g".repeat(400),
      fbclid: "f".repeat(400),
      ttclid: "t".repeat(900),
    })
      .map(([k, v]) => `${k}=${v}`)
      .join("&")}`,
    cookies: TUDO,
  });
  assert.ok(cookie(grande, COOKIE.atribuicao).valor.length <= 3000);
});

test("cookie adulterado ou de outra versão é descartado", () => {
  assert.equal(desserializar("lixo!!"), null);
  assert.equal(desserializar(Buffer.from(JSON.stringify({ v: 99 })).toString("base64url")), null);
  const ok = serializar({
    v: 1,
    primeiro: { em: 1, origem: "a", meio: "b", parametros: {}, ids: {}, pagina: "/" },
    ultimo: { em: 1, origem: "a", meio: "b", parametros: {}, ids: {}, pagina: "/" },
    toques: 1,
  });
  assert.equal(desserializar(ok).toques, 1);
});

test("query string não vai para o cookie (pode conter dado pessoal)", () => {
  const p = planejar({ caminho: "/obrigado?email=fulano@x.com&utm_source=news", cookies: TUDO });
  const a = atribuicaoDe(p);
  assert.equal(a.ultimo.pagina, "/obrigado");
  assert.ok(!JSON.stringify(a).includes("fulano"));
});
