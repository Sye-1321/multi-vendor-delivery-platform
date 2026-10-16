import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { ExceptionResponseSchema } from './swagger.schemas';

export const mongoIdParam = (name: string) =>
  ApiParam({
    name,
    description: 'MongoDB ObjectId',
    schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
  });

export function ApiResultResponse(
  status: number,
  options: { model?: Type<unknown>; array?: boolean } = {},
) {
  const dataSchema = options.model
    ? options.array
      ? { type: 'array', items: { $ref: getSchemaPath(options.model) } }
      : { $ref: getSchemaPath(options.model) }
    : { description: 'Endpoint-specific response data.' };
  return applyDecorators(
    ...(options.model ? [ApiExtraModels(options.model)] : []),
    ApiExtraModels(ExceptionResponseSchema),
    ApiResponse({
      status,
      schema: {
        type: 'object',
        required: ['isSuccess', 'message'],
        properties: {
          isSuccess: { type: 'boolean', example: true },
          data: dataSchema,
          message: { type: 'string' },
        },
      },
    }),
    ApiBadRequestResponse({
      description:
        'May be a domain Result.fail response or an exception-filter response.',
      schema: {
        oneOf: [
          {
            type: 'object',
            required: ['isSuccess', 'message', 'errorCode'],
            properties: {
              isSuccess: { type: 'boolean', example: false },
              data: { nullable: true, example: null },
              message: { type: 'string' },
              errorCode: { type: 'integer' },
            },
          },
          { $ref: getSchemaPath(ExceptionResponseSchema) },
        ],
      },
    }),
  );
}

export const ApiNoContentResponse = () =>
  ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'No content.' });

export function ApiEndpoint(
  summary: string,
  options: {
    status?: number;
    model?: Type<unknown>;
    array?: boolean;
    auth?: 'access-token' | 'refresh-token' | false;
    noContent?: boolean;
  } = {},
) {
  const decorators: Array<
    ClassDecorator | MethodDecorator | PropertyDecorator
  > = [ApiOperation({ summary })];
  if (options.auth) decorators.push(ApiBearerAuth(options.auth));
  if (options.noContent) {
    decorators.push(ApiNoContentResponse());
  } else {
    decorators.push(
      ApiResultResponse(options.status ?? HttpStatus.OK, {
        model: options.model,
        array: options.array,
      }),
    );
  }
  return applyDecorators(...decorators);
}
