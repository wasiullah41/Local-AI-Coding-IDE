import path from 'path';

export const APP_PATHS = {
  data: path.join(__dirname, '../../data'),
  database: path.join(__dirname, '../../data/ide.sqlite'),
  logs: path.join(__dirname, '../../data/logs'),
  extensions: path.join(__dirname, '../../data/extensions'),
  settings: path.join(__dirname, '../../data/settings.json'),
};
