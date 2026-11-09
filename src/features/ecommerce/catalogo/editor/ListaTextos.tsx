"use client";

import type { ChangeEvent } from "react";
import styled from "@emotion/styled";
import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { TextField } from "@/components/ui/TextField";
import { Alca, useArrastar } from "../comum";

let sequencia = 0;
/** Chave estável das linhas editáveis (só na tela; o backend recebe a lista de textos). */
export const novaChave = () => `l${++sequencia}`;

export type ItemTexto = { id: string; texto: string };
export const paraItens = (textos: readonly string[]): ItemTexto[] => textos.map((texto) => ({ id: novaChave(), texto }));

/** Lista de textos com arrastar para reordenar, remover e adicionar (parágrafos, peças do kit). */
export function ListaTextos({ itens, onChange, rotulo, maximo, maximoTexto, multilinha = false, placeholder, adicionar, disabled }: {
  itens: ItemTexto[]; onChange: (itens: ItemTexto[]) => void; rotulo: string; maximo: number; maximoTexto: number; multilinha?: boolean; placeholder?: string; adicionar: string; disabled?: boolean;
}) {
  const { linha, alca } = useArrastar(itens, onChange, undefined, !disabled);
  return <Lista>
    {itens.map((item, posicao) => <Linha key={item.id} {...linha(item, posicao)}>
      <Alca rotulo={`${rotulo} ${posicao + 1}`} {...alca(item, posicao)} disabled={disabled} />
      <TextField label={`${rotulo} ${posicao + 1}`} hideLabel multiline={multilinha || undefined} rows={multilinha ? 3 : undefined} value={item.texto} placeholder={placeholder} maxLength={maximoTexto}
        onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(itens.map((outro) => (outro.id === item.id ? { ...outro, texto: event.target.value } : outro)))} />
      <IconButton icon={TrashIcon} label={`Remover ${rotulo.toLowerCase()} ${posicao + 1}`} variant="ghost" size="sm" tooltip="left" disabled={disabled} onClick={() => onChange(itens.filter((outro) => outro.id !== item.id))} />
    </Linha>)}
    <Button variant="ghost" size="sm" icon={PlusIcon} disabled={disabled || itens.length >= maximo} onClick={() => onChange([...itens, { id: novaChave(), texto: "" }])}>
      {itens.length >= maximo ? `Limite de ${maximo}` : adicionar}
    </Button>
  </Lista>;
}

export const Lista = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: ${({ theme }) => theme.spacing(2)};

  > button:last-child { align-self: flex-start; }
`;

export const Linha = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: ${({ theme }) => theme.spacing(1.5)};
  align-items: start;
  border-radius: ${({ theme }) => theme.radii.md};
  transition: opacity ${({ theme }) => theme.transitions.fast};

  > button:first-of-type { margin-top: 0.25rem; }
  &[data-arrastando] { opacity: 0.45; }
`;
