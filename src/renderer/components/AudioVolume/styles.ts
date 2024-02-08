import styled from 'styled-components';
import { theme } from '../../theme';

export const Wrapper = styled.div`
  flex-grow: 1;
  margin: 0 3px;
  padding: 0 10px;
  padding-top: 5px;
  border-radius: ${theme.borderRadius}px;
  box-shadow: ${theme.boxShadow.soft};
`;

export const FileName = styled.div`
  text-transform: capitalize;
  font-size: 12px;
  color: ${theme.color.text.secondary};
`;
