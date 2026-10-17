"use client";

import styled from "@emotion/styled";
import { WarningCircleIcon } from "@phosphor-icons/react";
import { EmptyState } from "@/components/ui/EmptyState";

const Root = styled.main`
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 100dvh;
  padding: ${({ theme }) => theme.spacing(6)};
`;

/** Banco ausente, mal configurado ou indisponível: explica o problema sem expor valores. */
export function ConfigurationNotice({ title, message }: { title: string; message: string }) {
  return (
    <Root>
      <EmptyState icon={<WarningCircleIcon size={28} />} title={title} description={message} />
    </Root>
  );
}
