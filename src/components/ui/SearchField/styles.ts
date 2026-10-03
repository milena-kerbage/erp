import styled from "@emotion/styled";

export const Root = styled.label`
  display: inline-flex;
  align-items: center;
  flex: 0 1 17.5rem;
  gap: ${({ theme }) => theme.spacing(2)};
  min-width: 10rem;
  height: 2.25rem;
  padding: ${({ theme }) => theme.spacing(0, 1.5, 0, 3)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme }) => theme.palette.neutral[0]};
  color: ${({ theme }) => theme.colors.text.muted};
  cursor: text;
  transition:
    border-color ${({ theme }) => theme.transitions.fast},
    box-shadow ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.border.default};
  }

  &:focus-within {
    border-color: ${({ theme }) => theme.palette.sage[400]};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary.subtle};
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  svg {
    flex-shrink: 0;
  }
`;

export const Input = styled.input`
  flex: 1;
  min-width: 0;
  height: 100%;
  border: 0;
  outline: none;
  background: transparent;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.primary};

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.muted};
  }

  &::-webkit-search-cancel-button {
    display: none;
  }
`;

export const Kbd = styled.kbd`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  height: 1.375rem;
  padding: ${({ theme }) => theme.spacing(0, 1.5)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.xs};
  background-color: ${({ theme }) => theme.colors.background.surface};
  font-family: ${({ theme }) => theme.fonts.body};
  font-size: 0.6875rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.secondary};
  letter-spacing: 0.02em;
`;
