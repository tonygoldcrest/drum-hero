import styled from 'styled-components';
import { theme } from '../../theme';

export const Wrapper = styled.div`
  height: 100%;
  overflow-y: auto;
`;

export const VirtualList = styled.div`
  width: 100%;
  position: relative;
`;

export const VirtualListItem = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  display: flex;

  &:hover {
    box-shadow: ${theme.boxShadow.soft};
    z-index: 1;
  }
`;
