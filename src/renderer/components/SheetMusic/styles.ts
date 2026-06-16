import styled, { css } from 'styled-components';
import themedark from '../../theme';

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
  background: ${themedark.color.accentSoftBg};
  border: 2px solid ${themedark.color.accent};
`;

export const MeasureHighlight = styled.button<{ $highlighted: boolean }>`
  position: absolute;
  z-index: -3;
  border-radius: ${themedark.radius.md}px;
  border: 0;
  background: transparent;
  cursor: pointer;
  ${(props) => (props.$highlighted ? MeasureHighlighted : '')}

  &:hover {
    background: ${themedark.color.accentSoftBg};
    box-shadow: ${themedark.shadow.accentSoft};
    border: 1px solid ${themedark.color.accentSoftBorder};
    z-index: -1;
  }
`;

export const Cursor = styled.div`
  position: absolute;
  z-index: 1;
  transform: translateX(-50%);
  pointer-events: none;
  box-shadow: ${themedark.shadow.accentButton};
`;

export const CursorHandle = styled.div`
  position: absolute;
  width: 12px;
  height: 12px;
  background: ${themedark.color.accent};
  transform: translateX(-50%) rotate(45deg);
  left: 50%;
  transform-origin: center;
  border-radius: 3px;
`;

export const CursorLine = styled.div`
  position: absolute;
  width: 4px;
  background: ${themedark.color.accent};
  height: 100%;
  border-radius: 3px;
  left: 50%;
  transform: translateX(-50%);
`;
