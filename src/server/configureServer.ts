import dotenv from 'dotenv';
import express, { Application } from 'express';
import bodyParser from 'body-parser';
import compression from 'compression';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import morgan from 'morgan';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import assignRequestId from './middlewares/assign-request-id';
import { HooksBuilderFunction, ServerConfig } from './types';
import { handleClientError, handleServerError } from './middlewares/error-handlers';
import { readDirRecursively } from '../utils';
import { handleRequest, HttpEndpoint } from '../routing';
import { hookAPI, triggerHooks } from './hooks';
import { validateRequest } from './middlewares/validate-request';

export const configureServer = (config: ServerConfig): express.Express => {
  const app = express();

  loadDotEnv(config.rootPath);
  registerHooks(config.hooks);
  triggerHooks('beforeMiddlewares', app);
  setupBaseMiddlewares(app);
  triggerHooks('beforeRoutes', app);
  setupBaseRoutes(app);
  setupParsedRoutes(app, config.handlersPath);

  if (config.router) {
    setupCustomRoutes(app, config.router);
  }

  triggerHooks('afterRoutes', app);

  if (config.swaggerDoc) {
    setupSwagger(app, config.swaggerDoc);
  }

  setupErrorHandlers(app);
  triggerHooks('afterErrorMiddlewares', app);

  return app;
};

const loadDotEnv = (rootPath: string): void => {
  dotenv.config({
    path: path.join(rootPath, '.env'),
  });
};

const registerHooks = (builderFn?: HooksBuilderFunction): void => {
  if (builderFn) {
    builderFn(hookAPI);
  }
};

const setupBaseMiddlewares = (app: express.Express): void => {
  app.use(assignRequestId);
  app.use(morgan('dev'));
  app.use(cors({ origin: true }));
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use(compression());
  app.use(
    fileUpload({
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  );
  app.use((req, res, next) => {
    res.header('X-powered-by', 'Extcore Server');
    next();
  });
};

const setupBaseRoutes = (app: express.Express): void => {
  app.get('/', (req: express.Request, res: express.Response) => {
    res.status(200).json({
      message: 'Server running',
      requestId: req.requestId,
    });
  });
};

const setupCustomRoutes = (app: express.Express, router: express.Router): void => {
  app.use('/', router);
};

const setupErrorHandlers = (app: express.Express): void => {
  app.use(handleClientError);
  app.use(handleServerError);
};

const setupParsedRoutes = (app: express.Express, directory: string): void => {
  const loadableHandlers = readDirRecursively(directory).filter(
    (file) => file.fileName.endsWith('handlers.ts') || file.fileName.endsWith('handlers.js'),
  );

  if (Array.isArray(loadableHandlers) && loadableHandlers.length > 0) {
    for (const file of loadableHandlers) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fileExports = require(path.join(file.absoluteDir, file.fileName));

      for (const key in fileExports) {
        if (fileExports[key] instanceof HttpEndpoint) {
          registerHttpEndpoint(app, fileExports[key]);
        }
      }
    }
  }
};

const registerHttpEndpoint = (app: express.Express, endpoint: HttpEndpoint<any>): void => {
  app[endpoint.getMethod()](endpoint.getPath(), [
    ...endpoint.getMiddlewares(),
    validateRequest(endpoint.getValidationSchema()),
    handleRequest(endpoint.getExpressHandler()),
  ] as Application[]);
};

const setupSwagger = (app: express.Express, swaggerDocument: Record<string, unknown>): void => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
};
