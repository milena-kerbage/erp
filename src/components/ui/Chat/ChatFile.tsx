"use client";

import styled from "@emotion/styled";
import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { fileKind } from "@/components/ui/FileItem";
import { IconTile } from "@/components/ui/IconTile";
import { formatBytes } from "@/lib/format";
import { MEDIA_WIDTH } from "./MediaGrid";

type ChatFileProps = {
  name: string;
  size: number;
  type: string;
  url?: string;
};

/** Cartão embutido no balão (mesma largura das imagens): tipo, nome e tamanho. */
const Root = styled.a`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2.5)};
  width: ${MEDIA_WIDTH};
  max-width: 100%;
  padding: ${({ theme }) => theme.spacing(2, 2, 2, 2)};
  /* Concêntrico com o balão (raio lg, 3px de recuo) */
  border-radius: calc(${({ theme }) => theme.radii.lg} - 3px);
  background-color: ${({ theme }) => theme.colors.interactive.hover};
  color: inherit;
  transition: background-color ${({ theme }) => theme.transitions.fast};

  &[href]:hover {
    background-color: ${({ theme }) => theme.colors.interactive.pressed};
  }
`;

const Texts = styled.span`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const Name = styled.span`
  overflow: hidden;
  font-size: 0.8125rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  line-height: 1.3;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const Meta = styled.span`
  font-size: 0.6875rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Download = styled.span`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  background-color: color-mix(in srgb, ${({ theme }) => theme.palette.neutral[0]} 70%, transparent);
  color: ${({ theme }) => theme.colors.text.secondary};
`;

/** "Contrato.pdf" → "PDF"; sem extensão, usa o tipo ("image/png" → "PNG"). */
function extension(name: string, type: string) {
  const fromName = name.includes(".") ? name.split(".").pop() : undefined;
  const fromType = type.split("/").pop();
  return (fromName || fromType || "Arquivo").toUpperCase().slice(0, 5);
}

/** Arquivo dentro da mensagem; clique baixa/abre. */
export function ChatFile({ name, size, type, url }: ChatFileProps) {
  const kind = fileKind(type);
  const content = (
    <>
      <IconTile icon={kind.icon} tone={kind.tone} size="lg" />
      <Texts>
        <Name title={name}>{name}</Name>
        <Meta>
          {extension(name, type)} / {formatBytes(size)}
        </Meta>
      </Texts>
      {url && (
        <Download aria-hidden>
          <DownloadSimpleIcon size={15} />
        </Download>
      )}
    </>
  );

  return url ? (
    <Root href={url} download={name} target="_blank" rel="noopener noreferrer" aria-label={`Baixar ${name}`}>
      {content}
    </Root>
  ) : (
    <Root as="div">{content}</Root>
  );
}
