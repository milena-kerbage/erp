"use client";

import styled from "@emotion/styled";

export const ManagerSurface = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(4)};
  padding: ${({ theme }) => theme.spacing(5)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.palette.neutral[0]};
  min-width: 0;
  ${({ theme }) => theme.media.md} { padding: ${({ theme }) => theme.spacing(4)}; }
`;

export const PanelHeading = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(3)};
  h3 { font-size: ${({ theme }) => theme.fontSizes.lg}; font-weight: ${({ theme }) => theme.fontWeights.semibold}; }
`;

export const TabBody = styled.div`
  padding-top: ${({ theme }) => theme.spacing(5)};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(5)};
  min-width: 0;
`;

export const ManagerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
  gap: ${({ theme }) => theme.spacing(3)};
`;

export const ManagerCard = styled.article`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(3)};
  padding: ${({ theme }) => theme.spacing(4)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.background.surface};
  min-width: 0;
  h4 { font-size: 0.875rem; font-weight: ${({ theme }) => theme.fontWeights.semibold}; }
  code { overflow-wrap: anywhere; font-size: 0.75rem; }
`;

export const ProgressBar = styled.progress`
  width: 100%;
  height: 0.5rem;
  appearance: none;
  overflow: hidden;
  border: 0;
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ theme }) => theme.palette.neutral[100]};
  &::-webkit-progress-bar { background: ${({ theme }) => theme.palette.neutral[100]}; }
  &::-webkit-progress-value { background: ${({ theme }) => theme.colors.primary.main}; }
  &::-moz-progress-bar { background: ${({ theme }) => theme.colors.primary.main}; }
`;

export const TableOverflow = styled.div`
  overflow-x: auto;
  min-width: 0;
`;
