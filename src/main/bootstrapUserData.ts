import path from 'path';
import { app } from 'electron';

const userDataDir = process.env.SK_USER_DATA_DIR;

if (userDataDir) {
  app.setPath('userData', path.resolve(process.cwd(), userDataDir));
}
