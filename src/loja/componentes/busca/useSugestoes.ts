"use client";

import { useEffect, useState } from "react";
import { MINIMO_CARACTERES, normalizarTexto, type RespostaSugestoes } from "@/loja/lib/catalogo/sugestoes";

export const ESPERA_DIGITACAO = 200; // debounce (a referência mede ~150–250 ms)

// Respostas já vistas nesta visita: voltar a um termo (apagar uma letra) não refaz o pedido.
const respostas = new Map<string, RespostaSugestoes>();

// Sugestões da gaveta: pede /api/busca/sugestoes 200 ms depois da última tecla, a partir de 2 letras,
// e cancela o pedido anterior. Enquanto o novo não chega, a resposta anterior continua na tela
// (sem piscar); `atual` diz se ela já corresponde ao texto digitado.
export function useSugestoes(texto: string): { resposta: RespostaSugestoes | null; atual: boolean; carregando: boolean; falhou: boolean } {
  const chave = normalizarTexto(texto);
  const [estado, setEstado] = useState<{ chave: string; resposta: RespostaSugestoes | null; falhou: boolean }>({ chave: "", resposta: null, falhou: false });

  useEffect(() => {
    if (chave.length < MINIMO_CARACTERES) return;
    const guardada = respostas.get(chave);
    if (guardada) {
      setEstado({ chave, resposta: guardada, falhou: false });
      return;
    }
    const controle = new AbortController();
    const espera = window.setTimeout(async () => {
      try {
        const resposta = await fetch(`/api/busca/sugestoes?q=${encodeURIComponent(texto.trim())}`, { signal: controle.signal });
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
        const dados = (await resposta.json()) as RespostaSugestoes;
        respostas.set(chave, dados);
        setEstado({ chave, resposta: dados, falhou: false });
      } catch (falha) {
        if (controle.signal.aborted) return;
        console.warn("[busca] sugestões indisponíveis", falha);
        setEstado((anterior) => ({ ...anterior, chave, falhou: true }));
      }
    }, ESPERA_DIGITACAO);
    return () => {
      window.clearTimeout(espera);
      controle.abort();
    };
  }, [chave, texto]);

  if (chave.length < MINIMO_CARACTERES) return { resposta: null, atual: false, carregando: false, falhou: false };
  const atual = estado.chave === chave;
  return { resposta: estado.resposta, atual: atual && !estado.falhou, carregando: !atual, falhou: atual && estado.falhou };
}
