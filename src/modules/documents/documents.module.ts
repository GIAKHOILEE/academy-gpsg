import { Module } from '@nestjs/common'
import { DocumentsService } from './documents.service'
import { AdminDocumentsController, UserDocumentsController } from './documents.controller'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DocumentsEntity } from './documents.entity'
import { DocumentsOrderEntity } from './documents-order.entity'

@Module({
  imports: [TypeOrmModule.forFeature([DocumentsEntity, DocumentsOrderEntity])],
  controllers: [AdminDocumentsController, UserDocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
