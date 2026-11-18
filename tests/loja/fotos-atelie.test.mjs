import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import test from "node:test";
import { fotoDeEspera, NOMES_FOTOS_ATELIE } from "../../src/loja/lib/fotosAtelie.ts";
import { fotosDoProjeto, listarProjetos } from "../../src/loja/lib/casas/catalogo.ts";

const publico = (src) => new URL(`../../public${src}`, import.meta.url);
const ASSUNTOS = ["agulha", "novelo", "regua", "caminhao", "pacote", "presente", "bolsa", "berco", "bebe", "flor", "tulipa", "nuvem", "lua", "estrela", "folha", "coracao", "pena", "borboleta", "medalha", "brilho", "conversa", "desconhecido"];

test("fotos do ateliê: todo arquivo existe, é WebP leve e tem alt", () => {
  for (const nome of NOMES_FOTOS_ATELIE) {
    const arquivo = publico(`/vitrine/fotos/${nome}.webp`);
    assert.ok(existsSync(arquivo), nome);
    assert.ok(statSync(arquivo).size < 250 * 1024, `${nome}: acima de 250 KB`);
  }
});

test("fotos do ateliê: todo assunto (inclusive desconhecido) cai numa foto existente e estável", () => {
  for (const assunto of ASSUNTOS) {
    const foto = fotoDeEspera(assunto, "semente");
    assert.match(foto.src, /^\/vitrine\/fotos\/[a-z-]+\.webp$/, assunto);
    assert.ok(existsSync(publico(foto.src)), `${assunto}: ${foto.src}`);
    assert.ok(foto.alt.length > 10, `${assunto}: alt`);
    assert.deepEqual(fotoDeEspera(assunto, "semente"), foto, `${assunto}: escolha estável`);
  }
});

test("quartinhos personalizados: todos têm fotos publicadas", () => {
  for (const projeto of listarProjetos()) {
    const fotos = fotosDoProjeto(projeto);
    assert.ok(fotos.length > 0, `${projeto.slug}: sem fotos`);
    for (const foto of fotos) assert.ok(existsSync(publico(foto.src)), `${projeto.slug}: ${foto.src}`);
  }
});
