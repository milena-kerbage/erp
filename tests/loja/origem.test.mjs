import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extrairToque, mesclar, serializar, COOKIE } from '../../src/loja/lib/rastreamento/nucleo.ts';
import { canalDoToque, dispositivoDe, origemDaAtribuicao, origemDaRequisicao, resumoDaOrigem } from '../../src/loja/lib/rastreamento/origem.ts';

const SITE = 'https://www.ateliemilenakerbage.com.br';
const toque = (url, referer = null, em = 1_800_000_000) => extrairToque(new URL(url, SITE), referer, em);

test('canal em português: anúncios, busca, redes, IA, indicação e direto', () => {
  assert.equal(canalDoToque(toque('/?gclid=abc')), 'Google Ads');
  assert.equal(canalDoToque(toque('/?utm_source=google&utm_medium=cpc&utm_campaign=natal')), 'Google Ads');
  assert.equal(canalDoToque(toque('/?utm_source=instagram&utm_medium=paid_social')), 'Meta Ads (Instagram/Facebook)');
  assert.equal(canalDoToque(toque('/', 'https://www.google.com/')), 'Busca orgânica (google)');
  assert.equal(canalDoToque(toque('/', 'https://l.instagram.com/')), 'Redes sociais (instagram)');
  assert.equal(canalDoToque(toque('/', 'https://chatgpt.com/')), 'Assistente de IA (chatgpt)');
  assert.equal(canalDoToque(toque('/', 'https://blogdamamae.com.br/post')), 'Outro site (blogdamamae)');
  assert.equal(canalDoToque({ origem: '(direct)', meio: '(none)', ids: {} }), 'Direto');
});

test('dispositivo sem guardar o User-Agent inteiro', () => {
  assert.equal(dispositivoDe('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148'), 'Celular / iOS');
  assert.equal(dispositivoDe('Mozilla/5.0 (Linux; Android 15; Pixel 9) Mobile Safari/537.36'), 'Celular / Android');
  assert.equal(dispositivoDe('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15'), 'Computador / macOS');
  assert.equal(dispositivoDe(''), undefined);
});

test('primeiro toque (o que trouxe) e último toque (o que fechou) na ficha do lead', () => {
  const primeiro = toque('/kit-berco?utm_source=instagram&utm_medium=social&utm_campaign=lancamento&utm_content=reels', 'https://l.instagram.com/', 1_800_000_000);
  const ultimo = toque('/produto/kit-berco-bia?utm_source=google&utm_medium=cpc&utm_campaign=natal&gclid=G123', null, 1_800_500_000);
  const origem = origemDaAtribuicao(mesclar(mesclar(null, primeiro), ultimo), { origemSite: SITE, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148' });
  assert.equal(origem.channel, 'Redes sociais (instagram)');
  assert.equal(origem.utmCampaign, 'lancamento');
  assert.equal(origem.utmContent, 'reels');
  assert.equal(origem.landingPage, `${SITE}/kit-berco`);
  assert.equal(origem.referrer, 'https://l.instagram.com');
  assert.equal(origem.device, 'Celular / iOS');
  assert.equal(origem.lastChannel, 'Google Ads');
  assert.equal(origem.lastCampaign, 'natal');
  assert.equal(origem.lastLandingPage, `${SITE}/produto/kit-berco-bia`);
  assert.equal(origem.gclid, 'G123');
  assert.equal(origem.touches, '2');
  assert.match(resumoDaOrigem(origem), /^Google Ads · campanha natal · entrou por \/produto\/kit-berco-bia$/);
  // Uma visita só: não há "último toque" diferente do primeiro.
  const unica = origemDaAtribuicao(mesclar(null, primeiro), { origemSite: SITE });
  assert.equal(unica.lastChannel, undefined);
  assert.equal(unica.touches, '1');
  assert.equal(origemDaAtribuicao(null, { origemSite: SITE }), null);
});

test('lê o cookie de atribuição do cabeçalho da requisição', () => {
  const cookie = serializar(mesclar(null, toque('/?utm_source=google&utm_medium=cpc&utm_campaign=natal')));
  const cabecalhos = new Headers({ cookie: `outro=1; ${COOKIE.atribuicao}=${cookie}; mais=2`, 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' });
  const origem = origemDaRequisicao(cabecalhos, SITE);
  assert.equal(origem.channel, 'Google Ads');
  assert.equal(origem.device, 'Computador / Windows');
  assert.equal(origemDaRequisicao(new Headers({ cookie: `${COOKIE.atribuicao}=adulterado` }), SITE), null);
  assert.equal(origemDaRequisicao(new Headers(), SITE), null);
});
