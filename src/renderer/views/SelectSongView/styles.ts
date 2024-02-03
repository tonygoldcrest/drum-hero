import styled from 'styled-components';

export const Wrapper = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #e5e1da;
`;

export const SongViewOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
`;

export const SongListContainer = styled.div`
  width: 100%;
  max-width: 1000px;
  flex-grow: 1;
  overflow: hidden;
  margin: 0 auto;
  box-shadow:
    rgba(60, 64, 67, 0.3) 0px 1px 2px 0px,
    rgba(60, 64, 67, 0.15) 0px 1px 3px 1px;
  background: #fbf9f1;
`;
