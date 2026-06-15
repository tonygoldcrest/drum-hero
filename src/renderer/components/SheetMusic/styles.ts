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

export const CursorLine = styled.div`
  position: absolute;
  z-index: 1;
  width: 7px;
  transform: translateX(-50%);
  background: rgba(229, 225, 218, 0.5);
  backdrop-filter: blur(2px);
  border-radius: 3px;
  border: 2px solid rgba(45, 52, 54, 1);
  pointer-events: none;
  box-shadow:
    rgba(0, 0, 0, 0.16) 0px 3px 6px,
    rgba(0, 0, 0, 0.23) 0px 3px 6px;
`;
