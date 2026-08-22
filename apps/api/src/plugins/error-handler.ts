import { type FastifyError, type FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { ErrorCode, fail } from '@bharatlens/shared';

function statusFromError(error: FastifyError): number {
  return error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
}

const errorHandlerPlugin: FastifyPluginAsync = async (app) => {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error({ err: error, requestId: request.requestId }, 'unhandled error');

    const statusCode = statusFromError(error);
    const code = statusCode === 400 ? ErrorCode.VALIDATION_ERROR : ErrorCode.INTERNAL_ERROR;
    const message =
      statusCode >= 500 ? 'An unexpected error occurred' : error.message || 'Request failed';

    void reply.status(statusCode).send(fail(code, message));
  });

  app.setNotFoundHandler((request, reply) => {
    void reply
      .status(404)
      .send(fail('NOT_FOUND', `Route ${request.method} ${request.url} not found`));
  });
};

export default fp(errorHandlerPlugin, { name: 'error-handler' });
