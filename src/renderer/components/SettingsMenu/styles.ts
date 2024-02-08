import styled from 'styled-components';

export const Wrapper = styled.div``;

export const SettingsItem = styled.div`
  display: flex;
  justify-content: center;
  padding: 10px 0;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;

  & > * + * {
    margin-left: 5px;
  }
`;
