import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { PaginatedResponse } from '../dto/pagination.dto';

export const ApiPaginatedResponse = <TModel extends Type>(
  model: TModel,
  description = 'Resultado paginado.',
) =>
  applyDecorators(
    ApiExtraModels(PaginatedResponse, model),
    ApiOkResponse({
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(PaginatedResponse) },
          {
            properties: {
              data: { type: 'array', items: { $ref: getSchemaPath(model) } },
            },
          },
        ],
      },
    }),
  );
