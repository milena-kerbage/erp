import assert from "node:assert/strict";
import test from "node:test";
import {
  buscarFeed,
  detalheDoErro,
  imagemDe,
  LIMITE_POSTS,
  normalizarMidia,
  normalizarResposta,
  rotaDaImagem,
  trechoDe,
  urlDaCdn,
  urlDoFeed,
} from "../../src/loja/lib/instagram/feed.ts";

// Resposta de exemplo no formato de GET graph.instagram.com/v{versão}/me/media (dados fictícios locais).
const CDN = "https://scontent-gru2-1.cdninstagram.com/v/t51.29350-15/";
const RESPOSTA = {
  data: [
    {
      id: "17890000000000001",
      caption: "Kit berço Jardim rosê saindo do ateliê hoje!\n\n#enxoval #quartodebebe",
      media_type: "IMAGE",
      media_url: `${CDN}foto1.jpg?stp=dst-jpg&oe=6800AAAA`,
      permalink: "https://www.instagram.com/p/ABC123/",
      timestamp: "2026-11-01T14:30:00+0000",
    },
    {
      id: "17890000000000002",
      caption: "Bastidores: bordando o nome da Alice",
      media_type: "VIDEO",
      media_url: `${CDN}video2.mp4?oe=6800BBBB`,
      thumbnail_url: `${CDN}capa2.jpg?oe=6800BBBB`,
      permalink: "https://www.instagram.com/reel/DEF456/",
      timestamp: "2026-10-28T10:00:00+0000",
    },
    {
      id: "17890000000000003",
      media_type: "CAROUSEL_ALBUM",
      media_url: `https://instagram.ffor1-1.fna.fbcdn.net/v/capa3.jpg?oe=6800CCCC`,
      permalink: "https://www.instagram.com/p/GHI789/",
      timestamp: "2026-10-20T09:00:00+0000",
    },
    // vídeo sem capa (áudio protegido): fica de fora
    { id: "17890000000000004", media_type: "VIDEO", permalink: "https://www.instagram.com/reel/X/", timestamp: "2026-10-10T09:00:00+0000" },
    // domínio fora da CDN da Meta: fica de fora
    { id: "17890000000000005", media_type: "IMAGE", media_url: "https://exemplo.com/a.jpg", permalink: "https://www.instagram.com/p/Y/" },
    // permalink fora do Instagram: fica de fora
    { id: "17890000000000006", media_type: "IMAGE", media_url: `${CDN}f6.jpg`, permalink: "https://golpe.example/p/Z/" },
    // repetido: entra uma vez só
    {
      id: "17890000000000001",
      media_type: "IMAGE",
      media_url: `${CDN}foto1.jpg`,
      permalink: "https://www.instagram.com/p/ABC123/",
    },
  ],
  paging: { cursors: { before: "a", after: "b" } },
};

test("normalizarResposta: tipos, capa do vídeo, carrossel, rota própria e filtros", () => {
  const posts = normalizarResposta(RESPOSTA);
  assert.deepEqual(
    posts.map((post) => [post.id, post.tipo]),
    [
      ["17890000000000001", "imagem"],
      ["17890000000000002", "video"],
      ["17890000000000003", "carrossel"],
    ],
  );
  const [foto, video, album] = posts;
  assert.equal(foto.imagem, "/api/instagram/midia/17890000000000001");
  assert.equal(foto.link, "https://www.instagram.com/p/ABC123/");
  assert.equal(foto.data, "2026-11-01T14:30:00.000Z");
  assert.equal(foto.trecho, "Kit berço Jardim rosê saindo do ateliê hoje! #enxoval #quartodebebe");
  assert.match(video.origem, /capa2\.jpg/); // vídeo usa thumbnail_url, nunca o .mp4
  assert.match(album.origem, /capa3\.jpg/); // carrossel usa media_url
  assert.equal(album.legenda, "");
  assert.equal(album.trecho, "");
});

test("normalizarResposta: formato inesperado vira null; lista vazia é válida; respeita o limite", () => {
  assert.equal(normalizarResposta(null), null);
  assert.equal(normalizarResposta({ error: { message: "x" } }), null);
  assert.deepEqual(normalizarResposta({ data: [] }), []);
  const muitos = {
    data: Array.from({ length: 30 }, (_, i) => ({
      id: String(1000 + i),
      media_type: "IMAGE",
      media_url: `${CDN}${i}.jpg`,
      permalink: `https://www.instagram.com/p/${i}/`,
    })),
  };
  assert.equal(normalizarResposta(muitos).length, LIMITE_POSTS);
  assert.equal(normalizarResposta(muitos, 6).length, 6);
});

test("imagemDe e urlDaCdn: só https nos domínios da CDN do Instagram/Facebook", () => {
  assert.ok(urlDaCdn(`${CDN}a.jpg`));
  assert.ok(urlDaCdn("https://scontent.xx.fbcdn.net/v/a.jpg"));
  assert.equal(urlDaCdn("http://scontent.cdninstagram.com/a.jpg"), null);
  assert.equal(urlDaCdn("https://cdninstagram.com.golpe.example/a.jpg"), null);
  assert.equal(urlDaCdn("javascript:alert(1)"), null);
  assert.equal(imagemDe({ media_type: "STORY", media_url: `${CDN}a.jpg` }), null);
  // carrossel cuja capa é um vídeo: usa a capa (thumbnail_url) se houver
  assert.match(imagemDe({ media_type: "CAROUSEL_ALBUM", media_url: `${CDN}v.mp4`, thumbnail_url: `${CDN}c.jpg` }), /c\.jpg/);
  assert.equal(imagemDe({ media_type: "CAROUSEL_ALBUM", media_url: `${CDN}v.mp4` }), null);
  assert.equal(normalizarMidia({ id: "../etc", media_type: "IMAGE", media_url: `${CDN}a.jpg`, permalink: "https://www.instagram.com/p/a/" }), null);
});

test("trechoDe: uma linha, corte na palavra e reticências", () => {
  assert.equal(trechoDe("  curta \n legenda  "), "curta legenda");
  const longa = "Palavra ".repeat(40);
  const trecho = trechoDe(longa, 50);
  assert.ok(trecho.length <= 51);
  assert.ok(trecho.endsWith("Palavra…"));
});

test("urlDoFeed: endpoint oficial, campos e limite", () => {
  const url = new URL(urlDoFeed("v27.0", "TOKEN"));
  assert.equal(url.origin + url.pathname, "https://graph.instagram.com/v27.0/me/media");
  assert.equal(url.searchParams.get("fields"), "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp");
  assert.equal(url.searchParams.get("limit"), "12");
  assert.equal(url.searchParams.get("access_token"), "TOKEN");
  assert.equal(rotaDaImagem("123"), "/api/instagram/midia/123");
});

test("fallback: sem token não chama a API", async () => {
  let chamadas = 0;
  const buscar = async () => {
    chamadas++;
    return Response.json(RESPOSTA);
  };
  assert.deepEqual(await buscarFeed({ token: undefined, buscar }), { ok: false, motivo: "sem-token" });
  assert.deepEqual(await buscarFeed({ token: "   ", buscar }), { ok: false, motivo: "sem-token" });
  assert.equal(chamadas, 0);
  assert.equal((await buscarFeed({ token: "T", versao: "latest", buscar })).motivo, "versao-invalida");
});

test("buscarFeed: sucesso com cache de 1 h e tag instagram", async () => {
  let init;
  const resultado = await buscarFeed({
    token: "SEGREDO",
    buscar: async (_url, opcoes) => {
      init = opcoes;
      return Response.json(RESPOSTA);
    },
  });
  assert.equal(resultado.ok, true);
  assert.equal(resultado.posts.length, 3);
  assert.deepEqual(init.next, { revalidate: 3600, tags: ["instagram"] });
  assert.ok(init.signal instanceof AbortSignal);
});

test("fallback: erro da API, resposta inválida, rede e tempo esgotado viram { ok: false } sem o token", async () => {
  const erro = await buscarFeed({
    token: "SEGREDO",
    buscar: async () => Response.json({ error: { message: "Invalid OAuth access token SEGREDO", type: "OAuthException", code: 190 } }, { status: 400 }),
  });
  assert.equal(erro.ok, false);
  assert.equal(erro.motivo, "erro-api");
  assert.match(erro.detalhe, /HTTP 400 código 190/);
  assert.doesNotMatch(erro.detalhe, /SEGREDO/);

  const invalida = await buscarFeed({ token: "T", buscar: async () => new Response("<html>", { status: 200 }) });
  assert.deepEqual(invalida, { ok: false, motivo: "resposta-invalida" });

  const rede = await buscarFeed({
    token: "SEGREDO",
    buscar: async () => {
      throw new TypeError("fetch failed para SEGREDO");
    },
  });
  assert.equal(rede.motivo, "rede");
  assert.doesNotMatch(rede.detalhe, /SEGREDO/);

  const lenta = await buscarFeed({
    token: "T",
    tempoLimiteMs: 20,
    buscar: (_url, { signal }) =>
      new Promise((_resolver, rejeitar) => {
        signal.addEventListener("abort", () => rejeitar(signal.reason));
      }),
  });
  assert.equal(lenta.motivo, "tempo-esgotado");

  assert.equal(detalheDoErro(null, 500, "IGAAT0KEN"), "HTTP 500");
});
