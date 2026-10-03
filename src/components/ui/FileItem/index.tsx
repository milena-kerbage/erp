"use client";

import styled from "@emotion/styled";
import {
  DownloadSimpleIcon,
  FileIcon,
  FileImageIcon,
  FilePdfIcon,
  FileVideoIcon,
  XIcon,
  type Icon,
} from "@phosphor-icons/react";
import { IconButton } from "@/components/ui/IconButton";
import { IconTile } from "@/components/ui/IconTile";
import { formatBytes } from "@/lib/format";
import type { Tone } from "@/styles/theme";

type FileItemProps = {
  name: string;
  size: number;
  type: string;
  /** Texto extra após o tamanho (ex.: data). */
  meta?: string;
  url?: string;
  onRemove?: () => void;
  /** `compact`: chip do compositor/mensagem. */
  variant?: "row" | "compact";
};

/** Ícone e cor pelo tipo do arquivo. */
export function fileKind(type: string): { icon: Icon; tone: Tone } {
  if (type.startsWith("image/")) return { icon: FileImageIcon, tone: "blue" };
  if (type.startsWith("video/")) return { icon: FileVideoIcon, tone: "lavender" };
  if (type === "application/pdf") return { icon: FilePdfIcon, tone: "rose" };
  return { icon: FileIcon, tone: "neutral" };
}

const Root = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(3)};
  min-width: 0;
  padding: ${({ theme }) => theme.spacing(2.5, 2.5, 2.5, 3)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.lg};
  background-color: ${({ theme }) => theme.palette.neutral[0]};
`;

const Compact = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  max-width: 15rem;
  padding: ${({ theme }) => theme.spacing(1.5, 1, 1.5, 1.5)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme }) => theme.palette.neutral[0]};
`;

const Texts = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
`;

const Name = styled.span`
  overflow: hidden;
  font-size: 0.8125rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const Meta = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};
`;

/** Arquivo anexado: ícone pelo tipo, nome, tamanho e ações. */
export function FileItem({ name, size, type, meta, url, onRemove, variant = "row" }: FileItemProps) {
  const kind = fileKind(type);
  const details = [formatBytes(size), meta].filter(Boolean).join(" / ");
  const Container = variant === "compact" ? Compact : Root;

  return (
    <Container>
      <IconTile icon={kind.icon} tone={kind.tone} size={variant === "compact" ? "md" : "lg"} />
      <Texts>
        <Name title={name}>{name}</Name>
        <Meta>{details}</Meta>
      </Texts>
      {url && variant === "row" && (
        <IconButton
          href={url}
          download={name}
          target="_blank"
          icon={DownloadSimpleIcon}
          label="Baixar"
          variant="ghost"
          size="sm"
        />
      )}
      {onRemove && (
        <IconButton
          icon={XIcon}
          label={`Remover ${name}`}
          variant="ghost"
          size="sm"
          onClick={onRemove}
        />
      )}
    </Container>
  );
}
