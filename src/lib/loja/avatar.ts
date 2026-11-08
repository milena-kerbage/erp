import { Avatar, Style, type StyleDefinition } from '@dicebear/core';
import gaze from '@dicebear/styles/gaze.json';

// Avatar ilustrado das CLIENTES da loja (DiceBear "Gaze", licença CC0 1.0, o mesmo estilo do ERP em
// src/lib/avatar.ts), gerado no SERVIDOR, sem serviço externo. Seed estável derivada do id da conta
// (UUID aleatório; nunca o e-mail ou o nome), cores da paleta da loja: fundo linho/sálvia clara e o
// rosto nos tons dos tecidos (sálvia, rosê, azul-bebê, cru, terracota suave). Devolve data URI SVG (~3 KB).
const estilo = new Style(gaze as unknown as StyleDefinition);
const FUNDOS = ['#F3EFE6', '#E6EADF', '#F4F6F0']; // linho, marcaSuave (sage 100), fundoProduto (sage 50)
const ROSTOS = ['#AEB8A0', '#C9D1BD', '#E2B8B0', '#B7CCDB', '#E3D7BF', '#D9A48F'];
const cache = new Map<string, string>();

export function avatarDaCliente(id: string): string {
  let url = cache.get(id);
  if (!url) {
    url = new Avatar(estilo, { seed: `loja-cliente:${id}`, backgroundColor: FUNDOS, bodyColor: ROSTOS } as ConstructorParameters<typeof Avatar>[1]).toDataUri();
    if (cache.size > 2000) cache.clear();
    cache.set(id, url);
  }
  return url;
}
