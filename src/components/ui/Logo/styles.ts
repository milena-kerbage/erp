import styled from "@emotion/styled";
import Link from "next/link";

export const Root = styled(Link)`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(3)};
  border-radius: ${({ theme }) => theme.radii.lg};

  img {
    display: block;
  }
`;
