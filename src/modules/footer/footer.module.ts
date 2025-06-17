import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Footer } from './footer.entity'
import { FooterService } from './footer.service'
import { FooterAdminController, FooterUserController } from './footer.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Footer])],
  controllers: [FooterAdminController, FooterUserController],
  providers: [FooterService],
  exports: [FooterService],
})
export class FooterModule {}
