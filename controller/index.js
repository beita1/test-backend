/* eslint-disable global-require */
const Router = require('@koa/router');
const config = require('config');
const Joi = require('joi');
const jwt = require('jsonwebtoken');

const apis = [
  require('./users'),
]
// TODO, if api no exist, no error

const koaRouter = new Router({
  prefix: config.get('routerPrefix') || '',
});

const optionsSchema = Joi.object({
  apiInfo: Joi.object({
    path: Joi.string().required(),
    validate: Joi.object().required(),
    skipAuth: Joi.boolean()
  }).required(),
  middlewares: Joi.array().required()
}).required();

const ApiRouter = function () {};
['get', 'post', 'put', 'del'].forEach((method) => {
  ApiRouter.prototype[method] = (apiInfo, middlewares) => {
    const result = optionsSchema.validate({
      apiInfo, middlewares
    });
    if (result.error) {
      throw new Error('Router Register Error');
    }

    const { path, validate: apiSchema } = apiInfo;

    if (apiInfo.skipAuth) {
      koaRouter[method](path, async (ctx, next) => {
        const apiResult = apiSchema.validate({
          body: ctx.request.body,
          query: ctx.request.query,
          params: ctx.request.params
        });
        if (apiResult.error) {
          throw apiResult.error;
        }

        ctx.validation = apiResult.value;
        await next();
      }, ...middlewares);
    } else {
      koaRouter[method](path, async (ctx, next) => {
        const apiResult = apiSchema.validate({
          body: ctx.request.body,
          query: ctx.request.query,
          params: ctx.request.params
        });
        if (apiResult.error) {
          throw apiResult.error;
        }

        ctx.validation = apiResult.value;
        ctx.validation.userId = jwt.verify(ctx.header.authorization, '123456').teacherId;
        await next();
      }, ...middlewares);
    }
  };
});

const apiRouter = new ApiRouter();
apis.forEach((apiModule) => {
  apiModule(apiRouter);
})

module.exports.register = (app) => {
  app.use(koaRouter.routes());
  app.use(koaRouter.allowedMethods());
};
