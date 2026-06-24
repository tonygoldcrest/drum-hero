import sourceMapSupport from 'source-map-support';
import { appState } from './AppState';

if (process.env.NODE_ENV === 'production') {
  sourceMapSupport.install();
}

appState.start();
