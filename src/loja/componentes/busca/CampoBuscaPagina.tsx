"use client";

import Form from "next/form";
import { useRef, useState } from "react";
import { css } from "styled-system/css";
import { MagnifyingGlass, X } from "@/loja/componentes/icones";
import { guardarBuscaRecente } from "./buscasRecentes";
import { botaoLimpar, campoPilula, entradaBusca } from "./estilos";

// Campo no topo da página de resultados (/busca): a mesma pílula da gaveta, já com o termo. O <Form>
// do Next navega sem recarregar (com a transição de página) e, sem JavaScript, é um GET comum.
// Quem usa passa key={termo}: o campo recomeça com o termo novo a cada busca.
export function CampoBuscaPagina({ termo }: { termo: string }) {
  const [texto, setTexto] = useState(termo);
  const campo = useRef<HTMLInputElement>(null);

  return (
    <search className={css({ w: "full", maxW: "[560px]" })}>
      <Form
        action="/busca"
        onSubmit={(evento) => {
          if (!texto.trim()) {
            evento.preventDefault();
            campo.current?.focus();
            return;
          }
          guardarBuscaRecente(texto);
        }}
        className={campoPilula}
      >
        <MagnifyingGlass size={16} aria-hidden className={css({ flexShrink: "0" })} />
        <input
          ref={campo}
          name="q"
          type="search"
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === "Escape" && texto) {
              evento.preventDefault();
              setTexto("");
            }
          }}
          placeholder="Buscar"
          aria-label="Buscar produtos"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="search"
          maxLength={100}
          className={entradaBusca}
        />
        {texto && (
          <button
            type="button"
            aria-label="Limpar busca"
            onClick={() => {
              setTexto("");
              campo.current?.focus();
            }}
            className={botaoLimpar}
          >
            <X size={16} aria-hidden />
          </button>
        )}
      </Form>
    </search>
  );
}
