export class ResponseDto {
  statusCode?: number
  messageCode: string
  data?: any
  meta?: any;
  [key: string]: any

  constructor(response: ResponseDto) {
    this.messageCode = response.messageCode
    this.statusCode = response.statusCode
    this.data = response.data
    this.meta = response.meta
  }
}
