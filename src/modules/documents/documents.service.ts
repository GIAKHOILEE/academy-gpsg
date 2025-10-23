import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm/repository/Repository'
import { DocumentsEntity } from './documents.entity'
import { CreateDocumentsDto } from './dtos/create-documents.dto'
import { IDocuments, IDocumentsOrder } from './documents.interface'
import { BuyDocumentsDto, CreateDocumentOrderDto, UpdateDocumentsDto, UserBuyDocumentDto } from './dtos/update-documents.dto'
import { formatStringDate, throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { DataSource, Not } from 'typeorm'
import { paginate, PaginationMeta } from '@common/pagination'
import { PaginateDocumentDto, PaginateDocumentOrderDto } from './dtos/paginate-documents.dto'
import { DocumentsOrderEntity } from './documents-order.entity'

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(DocumentsEntity)
    private readonly documentsRepository: Repository<DocumentsEntity>,
    private readonly dataSource: DataSource,
    @InjectRepository(DocumentsOrderEntity)
    private readonly documentsOrderRepository: Repository<DocumentsOrderEntity>,
  ) {}

  async createDocument(document: CreateDocumentsDto): Promise<IDocuments> {
    const documentMaxIndex = await this.documentsRepository.createQueryBuilder('document').select('MAX(document.index) as maxIndex').getRawOne()
    let maxIndex = 1.0001
    if (documentMaxIndex?.maxIndex) {
      maxIndex = documentMaxIndex.maxIndex + 100
    }

    // check trùng lô
    const documentExist = await this.documentsRepository.findOne({ where: { batch_code: document.batch_code } })
    if (documentExist) {
      throwAppException('BATCH_CODE_ALREADY_EXISTS', ErrorCode.BATCH_CODE_ALREADY_EXISTS, HttpStatus.BAD_REQUEST)
    }

    const newDocument = this.documentsRepository.create({ ...document, index: maxIndex })
    return this.documentsRepository.save(newDocument)
  }

  async updateDocument(id: number, document: UpdateDocumentsDto): Promise<void> {
    const documentEntity = await this.documentsRepository.findOne({ where: { id } })
    if (!documentEntity) {
      throwAppException('DOCUMENT_NOT_FOUND', ErrorCode.DOCUMENT_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    // nếu is_sold thì không được sửa quantity
    if (documentEntity.is_sold && document.quantity !== documentEntity.quantity) {
      throwAppException('IS_SOLD_DOCUMENT_CANNOT_UPDATE_QUANTITY', ErrorCode.IS_SOLD_DOCUMENT_CANNOT_UPDATE_QUANTITY, HttpStatus.BAD_REQUEST)
    }

    // check trùng lô
    const documentExist = await this.documentsRepository.findOne({ where: { batch_code: document.batch_code, id: Not(id) } })
    if (documentExist) {
      throwAppException('BATCH_CODE_ALREADY_EXISTS', ErrorCode.BATCH_CODE_ALREADY_EXISTS, HttpStatus.BAD_REQUEST)
    }

    await this.documentsRepository.update(id, document)
  }

  async updateIndex(id: number, index: number): Promise<void> {
    const document = await this.documentsRepository.exists({ where: { id } })
    if (!document) throwAppException('DOCUMENT_NOT_FOUND', ErrorCode.DOCUMENT_NOT_FOUND, HttpStatus.NOT_FOUND)
    await this.documentsRepository.createQueryBuilder('document').update(DocumentsEntity).set({ index }).where('id = :id', { id }).execute()
    return
  }

  // mua hàng
  async buyDocument(createDocumentOrderDto: CreateDocumentOrderDto): Promise<void> {
    const { buyDocuments, user } = createDocumentOrderDto
    if (!buyDocuments || buyDocuments.length === 0) return

    const ids = buyDocuments.map(i => i.id)

    // tạo queryRunner từ DataSource
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const documents = await queryRunner.manager
        .createQueryBuilder(DocumentsEntity, 'document')
        .setLock('pessimistic_write')
        .where('document.id IN (:...ids)', { ids })
        .getMany()

      if (documents.length !== ids.length) {
        throwAppException('DOCUMENT_NOT_FOUND', ErrorCode.DOCUMENT_NOT_FOUND, HttpStatus.NOT_FOUND)
      }

      // Kiểm tra số lượng từng document so với yêu cầu mua
      const notEnough = buyDocuments.some(item => {
        const doc = documents.find(d => d.id === item.id)
        return !doc || doc.quantity < item.quantity
      })

      if (notEnough) {
        throwAppException('DOCUMENT_QUANTITY_IS_NOT_ENOUGH', ErrorCode.DOCUMENT_QUANTITY_IS_NOT_ENOUGH, HttpStatus.BAD_REQUEST)
      }

      // Giảm số lượng tương ứng và cập nhật is_sold
      for (const item of buyDocuments) {
        const doc = documents.find(d => d.id === item.id)!
        doc.quantity = doc.quantity - item.quantity
        doc.is_sold = true
        await queryRunner.manager.save(DocumentsEntity, doc)

        // lưu thông tin người mua vào bảng documents_order
        // series là số tăng dần của quyển sách đó = số lớn nhất của document đó đã bán + 1
        const series = await this.documentsOrderRepository
          .createQueryBuilder('document_order')
          .select('MAX(document_order.series) as maxSeries')
          .where('document_order.document_id = :id', { id: doc.id })
          .getRawOne()
        const startSeries = series.maxSeries ? series.maxSeries + 1 : 1

        // với mỗi quantity là 1 row
        for (let i = 0; i < item.quantity; i++) {
          const documentsOrder = queryRunner.manager.create(DocumentsOrderEntity, {
            document_id: doc.id,
            series: startSeries + i,
            price: doc.sell_price,
            profit: doc.sell_price - doc.import_price,
            ...user,
          })
          await queryRunner.manager.save(DocumentsOrderEntity, documentsOrder)
        }
      }

      await queryRunner.commitTransaction()
    } catch (err) {
      await queryRunner.rollbackTransaction()
      throw err
    } finally {
      await queryRunner.release()
    }
  }

  async paginateDocuments(paginateDocumentDto: PaginateDocumentDto): Promise<{ data: IDocuments[]; meta: PaginationMeta }> {
    const query = this.documentsRepository.createQueryBuilder('document')

    const { data, meta } = await paginate(query, paginateDocumentDto)
    const formattedData = data.map(document => ({
      id: document.id,
      index: document.index,
      batch_code: document.batch_code,
      name: document.name,
      quantity: document.quantity,
      import_price: document.import_price,
      sell_price: document.sell_price,
      image: document.image,
      description: document.description,
      day_import: document.day_import,
    }))
    return { data: formattedData, meta }
  }

  async getDocumentById(id: number): Promise<IDocuments> {
    const document = await this.documentsRepository.findOne({ where: { id } })
    if (!document) throwAppException('DOCUMENT_NOT_FOUND', ErrorCode.DOCUMENT_NOT_FOUND, HttpStatus.NOT_FOUND)
    return document
  }

  async deleteDocument(id: number): Promise<void> {
    const isExist = await this.documentsRepository.exists({ where: { id } })
    if (!isExist) throwAppException('DOCUMENT_NOT_FOUND', ErrorCode.DOCUMENT_NOT_FOUND, HttpStatus.NOT_FOUND)
    await this.documentsRepository.delete(id)
    return
  }

  async paginateDocumentOrder(
    paginateDocumentOrderDto: PaginateDocumentOrderDto,
  ): Promise<{ data: IDocumentsOrder[]; meta: PaginationMeta; total_profit: number }> {
    const query = this.documentsOrderRepository
      .createQueryBuilder('document_order')
      .select([
        'document_order.id',
        'document_order.series',
        'document_order.price',
        'document_order.profit',
        'document_order.name',
        'document_order.email',
        'document_order.phone',
        'document_order.address',
        'document_order.note',
        'document_order.created_at',
        'document.id',
        'document.name',
        'document.batch_code',
        'document.import_price',
        'document.sell_price',
        'document.image',
      ])
      .leftJoin('document_order.document', 'document')
    const { data, meta } = await paginate(query, paginateDocumentOrderDto)

    console.log(data)
    let totalProfit = 0
    const formattedData: IDocumentsOrder[] = data.map(documentOrder => {
      totalProfit += documentOrder.profit
      return {
        id: documentOrder.id,
        series: documentOrder.series.toString().padStart(3, '0'),
        price: documentOrder.price,
        profit: documentOrder.profit,
        name: documentOrder.name,
        email: documentOrder.email,
        phone: documentOrder.phone,
        address: documentOrder.address,
        note: documentOrder.note,
        created_at: formatStringDate(documentOrder.created_at.toISOString()),
        document: {
          id: documentOrder.document.id,
          name: documentOrder.document.name,
          batch_code: documentOrder.document.batch_code,
          import_price: documentOrder.document.import_price,
          sell_price: documentOrder.document.sell_price,
          image: documentOrder.document.image,
        },
      }
    })
    return { data: formattedData, meta, total_profit: totalProfit }
  }

  async deleteDocumentOrder(id: number): Promise<void> {
    const isExist = await this.documentsOrderRepository.exists({ where: { id } })
    if (!isExist) throwAppException('DOCUMENT_ORDER_NOT_FOUND', ErrorCode.DOCUMENT_ORDER_NOT_FOUND, HttpStatus.NOT_FOUND)
    await this.documentsOrderRepository.delete(id)
    return
  }
}
