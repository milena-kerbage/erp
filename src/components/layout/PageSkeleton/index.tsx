"use client";

import styled from "@emotion/styled";
import { Skeleton } from "@/components/ui/Skeleton";
import { fadeIn } from "@/styles/animations";

/**
 * Esqueleto genérico enquanto uma tela carrega. Só aparece se demorar
 * (atraso de 180ms), para não piscar nas navegações rápidas.
 */
const Root = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(5)};
  animation: ${fadeIn} 240ms ease 180ms backwards;
`;

const Row = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing(3)};
`;

const Block = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(3)};
  padding: ${({ theme }) => theme.spacing(4)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.lg};
  background-color: ${({ theme }) => theme.palette.neutral[0]};
`;

export function PageSkeleton() {
  return (
    <Root role="status" aria-label="Carregando">
      <Row>
        <Skeleton $width="16rem" $height="2.25rem" $radius="md" />
        <Skeleton $width="9rem" $height="2.25rem" $radius="md" />
        <Skeleton $width="9rem" $height="2.25rem" $radius="md" />
      </Row>
      <Row>
        {[0, 1, 2, 3].map((item) => (
          <Block key={item}>
            <Skeleton $width="45%" $height="0.75rem" />
            <Skeleton $width="30%" $height="1.5rem" />
            <Skeleton $height="0.75rem" />
          </Block>
        ))}
      </Row>
      <Block>
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <Row key={item}>
            <Skeleton $width="1.75rem" $height="1.75rem" $radius="full" />
            <Skeleton $width="22%" $height="0.875rem" />
            <Skeleton $width="16%" $height="0.875rem" />
            <Skeleton $width="12%" $height="0.875rem" />
            <Skeleton $width="18%" $height="0.875rem" />
          </Row>
        ))}
      </Block>
    </Root>
  );
}
