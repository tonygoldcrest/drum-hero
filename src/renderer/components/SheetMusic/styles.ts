import styled, { css } from 'styled-components';
import { theme } from '../../theme';

export const Wrapper = styled.div`
  min-width: max-content;
  position: relative;
  z-index: 0;
`;

export const VexflowContainer = styled.div`
  min-width: max-content;
  pointer-events: none;

  & * {
    pointer-events: none;
  }
`;

export const MeasureHighlighted = css`
  box-shadow: ${theme.boxShadow.soft};
  background: ${theme.color.primaryLightest};
`;

export const MeasureHighlight = styled.button<{ $highlighted: boolean }>`
  position: absolute;
  z-index: -3;
  border-radius: ${theme.borderRadius}px;
  border: 0;
  background: transparent;
  cursor: pointer;
  ${(props) => (props.$highlighted ? MeasureHighlighted : '')}

  &:hover {
    background: ${theme.color.background};
    box-shadow: ${theme.boxShadow.soft};
    z-index: -1;
  }
`;
