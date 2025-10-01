import { Injectable, Inject, LoggerService, Scope } from '@nestjs/common'
import { WINSTON_MODULE_PROVIDER } from 'nest-winston'
import { Logger } from 'winston'

@Injectable({ scope: Scope.TRANSIENT })
export class CustomLogger implements LoggerService {
  private context?: string

  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  setContext(context: string) {
    this.context = context
  }

  log(message: any, context?: string) {
    context = context || this.context

    if (typeof message === 'object') {
      const { message: msg, ...meta } = message
      return this.logger.info(msg, { context, ...meta })
    }

    return this.logger.info(message, { context })
  }

  error(message: any, trace?: string, context?: string) {
    context = context || this.context

    if (message instanceof Error) {
      const { message: msg, name, stack, ...meta } = message
      return this.logger.error(msg, {
        context,
        name,
        stack: stack || trace,
        ...meta,
      })
    }

    return this.logger.error(message, { context, trace })
  }

  warn(message: any, context?: string) {
    context = context || this.context
    return this.logger.warn(message, { context })
  }

  debug(message: any, context?: string) {
    context = context || this.context
    return this.logger.debug(message, { context })
  }

  verbose(message: any, context?: string) {
    context = context || this.context
    return this.logger.verbose(message, { context })
  }
}
