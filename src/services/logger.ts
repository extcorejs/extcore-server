import { configure, getLogger, Logger as Log4JSLogger } from 'log4js';

export type Logger = Log4JSLogger;
export const configureLogger = configure;
export const logger = getLogger();
