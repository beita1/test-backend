const Koa = require('koa');
const conditional = require('koa-conditional-get');
const etag = require('koa-etag');
const cors = require('koa2-cors');
const helmet = require('koa-helmet');
const config = require('config');
const bodyParser = require('koa-bodyparser');

const { logger, mongo } = require('./lib');

const {
  logHandler, formatHandler, errorHandler, contextHandler,
} = require('./middleware');
const router = require('./controller');

const app = new Koa();

const gracefulShutdown = () => {
  // db shutdown
  mongo.shutdown(() => {
    // server.close
    process.exitCode = 1;
  });
}

module.exports.init = async () => {
  logger.info('init server');

  // init service
  await mongo.init();

  // register middleware
  app.use(errorHandler);

  app.use(conditional());
  app.use(etag());

  app.use(contextHandler);
  app.use(logHandler);
  app.use(formatHandler);

  app.use(bodyParser());
  // HTTP header security
  app.use(helmet());
  // Enable CORS for all routes
  app.use(cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowHeaders: ['Content-Type', 'Accept'],
    exposeHeaders: ['spacex-api-cache', 'spacex-api-response-time'],
  }));

  router.register(app);

  app.listen(config.get('listen_port'));

  process.on('SIGTERM', gracefulShutdown); // Handle kill commands
  process.on('uncaughtException', gracefulShutdown); // Prevent dirty exit on code-fault crashes:
  process.on('unhandledRejection', gracefulShutdown); // Prevent promise rejection exits
};

module.exports.shutdown = async () => {
  process.exit();
};
