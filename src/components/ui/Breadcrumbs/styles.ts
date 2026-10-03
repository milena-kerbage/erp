import styled from "@emotion/styled";
import Link from "next/link";

export const List = styled.ol`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1)};
  min-width: 0;
  font-size: 0.8125rem;
  line-height: ${({ theme }) => theme.lineHeights.tight};
  color: ${({ theme }) => theme.colors.text.muted};
`;

export const Item = styled.li`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1)};
  min-width: 0;
  white-space: nowrap;

  > svg {
    flex-shrink: 0;
  }
`;

export const CrumbLink = styled(Link)`
  border-radius: ${({ theme }) => theme.radii.xs};
  transition: color ${({ theme }) => theme.transitions.fast};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

/** Trilha com seções: abre um menu para trocar de seção. */
export const CrumbSwitcher = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin: -2px -4px;
  padding: 2px 4px;
  border-radius: ${({ theme }) => theme.radii.xs};
  color: inherit;
  transition:
    color ${({ theme }) => theme.transitions.fast},
    background-color ${({ theme }) => theme.transitions.fast};

  &:hover,
  &[aria-expanded="true"] {
    background-color: ${({ theme }) => theme.colors.interactive.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

export const Current = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.secondary};
`;
