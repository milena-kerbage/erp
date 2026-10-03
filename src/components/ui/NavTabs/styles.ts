import { css } from "@emotion/react";
import styled from "@emotion/styled";
import Link from "next/link";
import { transientOptions } from "@/lib/emotion/transient";
import { controlBase, controlSelected, controlVariant } from "@/styles/mixins";

export const List = styled.ul`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1)};
`;

export const Tab = styled(Link, transientOptions)<{ $active: boolean }>`
  ${({ theme }) => controlBase(theme)};
  ${({ theme }) => controlVariant(theme, "ghost")};
  ${({ theme, $active }) =>
    $active &&
    css`
      ${controlSelected(theme)};
      font-weight: ${theme.fontWeights.semibold};
    `};
  height: 2rem;
  padding: ${({ theme }) => theme.spacing(0, 3)};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  white-space: nowrap;
`;
