import type { Preview } from '@storybook/react';
import '../src/renderer/App.css';

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    controls: { expanded: true },
  },
};

export default preview;
