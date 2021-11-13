import { configureServer } from './configureServer';
import { HttpServer, ServerConfig } from './types';
import { configureLogger, logger } from '../services';

const DEFAULT_PORT = 3003;

export const createServer = (config: ServerConfig): HttpServer => {
  const port = config?.port || DEFAULT_PORT;

  const app = configureServer(config);

  return {
    getInstance: () => app,
    setLogger: (options) => {
      const loggerOptions = typeof options === 'function' ? options() : options;

      if (loggerOptions.pm2) {
        configureLogger({
          pm2: true,
          appenders: { out: { type: 'stdout' } },
          categories: { default: { appenders: ['out'], level: loggerOptions.level } },
        });
      }

      logger.level = loggerOptions.level;
    },
    start: (callback) => {
      const cb =
        typeof callback === 'function'
          ? callback
          : () => {
              console.log(`Listening on port ${port}...`);
            };

      app.listen(port, cb);
    },
  };
};
