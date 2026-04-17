import { HttpException, HttpStatus } from '@nestjs/common'

export type NestedData = {
  [key: string]: string | number | boolean | NestedData | undefined;
};
export class AppException extends HttpException {
  constructor(message: string, code: number, status: HttpStatus = HttpStatus.BAD_REQUEST, data?: NestedData) {
    super(
      {
        statusCode: code,
        message,
        data
      },
      status,
    )
  }
}
