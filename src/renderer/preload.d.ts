import { ElectronHandler } from '../preload/index';

declare global {
  interface Window {
    electron: ElectronHandler;
  }
}

export {};
