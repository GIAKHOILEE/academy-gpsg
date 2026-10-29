import { AnnouncementStation } from '@modules/announcement-station/announcement-station.entity'
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SmsDevice } from './entities/sms-device.entity'
import { SmsJob } from './entities/sms-job.entity'
import { AdminSmsGatewayController, SmsGatewayController } from './sms-gateway.controller'
import { SmsGatewayService } from './sms-gateway.service'
import { SmsGatewayWs } from './sms-gateway.ws'

@Module({
  imports: [TypeOrmModule.forFeature([SmsDevice, SmsJob, AnnouncementStation])],
  controllers: [SmsGatewayController, AdminSmsGatewayController],
  providers: [SmsGatewayService, SmsGatewayWs],
  exports: [SmsGatewayService, SmsGatewayWs],
})
export class SmsGatewayModule {}
