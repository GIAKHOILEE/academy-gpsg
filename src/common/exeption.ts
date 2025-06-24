import { HttpException, HttpStatus } from '@nestjs/common'

export class AppException extends HttpException {
  constructor(message: string, code: number, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(
      {
        statusCode: code,
        message,
      },
      status,
    )
  }
}
