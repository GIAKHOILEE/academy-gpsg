import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BooksAdminController, BooksController } from './books.controller'
import { Book } from './books.entity'
import { BooksService } from './books.service'

@Module({
  imports: [TypeOrmModule.forFeature([Book])],
  controllers: [BooksAdminController, BooksController],
  providers: [BooksService],
  exports: [BooksService],
})
export class BooksModule {}
