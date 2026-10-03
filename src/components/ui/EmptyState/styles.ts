import styled from "@emotion/styled";

export const Root = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing(2)};
  padding: ${({ theme }) => theme.spacing(16, 6)};
  text-align: center;
`;

export const IconWrap = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  margin-bottom: ${({ theme }) => theme.spacing(2)};
  border-radius: ${({ theme }) => theme.radii.xl};
  background-color: ${({ theme }) => theme.colors.primary.subtle};
  color: ${({ theme }) => theme.colors.primary.main};
`;

export const Title = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  line-height: ${({ theme }) => theme.lineHeights.tight};
`;

export const Description = styled.p`
  max-width: 26rem;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

export const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing(2)};
  margin-top: ${({ theme }) => theme.spacing(4)};
`;
