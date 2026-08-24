import { type FastifyError, type FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { DomainError, ErrorCode, fail } from '@bharatlens/shared';

const notFoundCodes = new Set<string>([
  ErrorCode.EVENT_NOT_FOUND,
  ErrorCode.COUNTRY_NOT_FOUND,
  ErrorCode.TOPIC_NOT_FOUND,
  ErrorCode.SOURCE_NOT_FOUND,
  ErrorCode.ASSESSMENT_NOT_FOUND,
  ErrorCode.CLAIM_NOT_FOUND,
  ErrorCode.ANALYSIS_RUN_NOT_FOUND,
  ErrorCode.CHAIN_NOT_FOUND,
]);

function statusFromDomain(error: DomainError): number {
  if (notFoundCodes.has(error.code)) {
    return 404;
  }

  if (error.code === ErrorCode.UNAUTHORIZED || error.code === ErrorCode.INVALID_CREDENTIALS) {
    return 401;
  }

  if (error.code === ErrorCode.FORBIDDEN) {
    return 403;
  }

  if (error.code === ErrorCode.VALIDATION_ERROR) {
    return 400;
  }

  if (error.code === ErrorCode.SERVICE_UNAVAILABLE) {
    return 503;
  }

  return 400;
}

const errorHandlerPlugin: FastifyPluginAsync = async (app) => {
  app.setErrorHandler((error: FastifyError | DomainError, request, reply) => {
    if (error instanceof DomainError) {
      const statusCode = statusFromDomain(error);
      if (statusCode >= 500) {
        request.log.error({ err: error, requestId: request.requestId }, 'domain error');
      } else {
        request.log.info({ err: error, requestId: request.requestId }, 'request rejected');
      }

      void reply.status(statusCode).send(fail(error.code, error.message));
      return;
    }

    request.log.error({ err: error, requestId: request.requestId }, 'unhandled error');

    const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
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
