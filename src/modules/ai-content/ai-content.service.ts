import { paginate, PaginationMeta } from '@common/pagination'
import { convertToSlug, formatStringDate, formatStringToDate, throwAppException } from '@common/utils'
import { AiImageSource, AiModuleType, AiStatus } from '@enums/ai-content.enum'
import { ErrorCode } from '@enums/error-codes.enum'
import { PostCatalogType } from '@enums/post.enum'
import { PostCatalog } from '@modules/post-catalog/post-catalog.entity'
import { Post } from '@modules/post/post.entity'
import { Story } from '@modules/storys/story/story.entity'
import { Topic } from '@modules/storys/topic/topic.entity'
import { WitnessFaithMenu } from '@modules/witness-faiths/_witness-faith-menu/witness-faith-menu.entity'
import { WitnessFaith } from '@modules/witness-faiths/witness-faith.entity'
import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { In, LessThanOrEqual, Repository } from 'typeorm'
import {
  CreateAiBatchDto,
  CreatePostCatalogTopAiBatchDto,
  CreateStoryAiBatchDto,
  CreateWitnessFaithAiBatchDto,
} from './dtos/create-ai-batch.dto'
import { PaginateAiArticleDto } from './dtos/paginate-ai-article.dto'
import { PaginateAiBatchDto } from './dtos/paginate-ai-batch.dto'
import { UpdateAiArticleDto } from './dtos/update-ai-article.dto'
import { UpdateAiBatchDto } from './dtos/update-ai-batch.dto'
import { AiContentBatch } from './entities/ai-content-batch.entity'
import { AiContentItem } from './entities/ai-content-item.entity'
import { GeminiAiService } from './gemini-ai.service'

@Injectable()
export class AiContentService implements OnModuleInit {
  private readonly logger = new Logger(AiContentService.name)
  private isProcessing = false
  private readonly defaultIntervalMinutes = Number(process.env.AI_GEN_INTERVAL_MINUTES) || 5

  constructor(
    @InjectRepository(AiContentBatch)
    private readonly batchRepository: Repository<AiContentBatch>,
    @InjectRepository(AiContentItem)
    private readonly itemRepository: Repository<AiContentItem>,
    @InjectRepository(Story)
    private readonly storyRepository: Repository<Story>,
    @InjectRepository(Topic)
    private readonly topicRepository: Repository<Topic>,
    @InjectRepository(WitnessFaith)
    private readonly witnessFaithRepository: Repository<WitnessFaith>,
    @InjectRepository(WitnessFaithMenu)
    private readonly witnessFaithMenuRepository: Repository<WitnessFaithMenu>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(PostCatalog)
    private readonly postCatalogRepository: Repository<PostCatalog>,
    private readonly geminiAiService: GeminiAiService,
  ) {}

  async onModuleInit() {
    // Khôi phục các bài bị treo ở trạng thái PROCESSING nếu server từng khởi động lại giữa chừng
    try {
      const stuckItems = await this.itemRepository.find({
        where: { status: AiStatus.PROCESSING },
      })
      if (stuckItems.length > 0) {
        this.logger.warn(`Phát hiện ${stuckItems.length} bài viết AI đang PROCESSING dở dang khi khởi động. Đưa lại về hàng chờ PENDING...`)
        for (const item of stuckItems) {
          item.status = AiStatus.PENDING
          await this.itemRepository.save(item)
          await this.updateModuleRecordStatus(item.module_type, item.target_record_id, AiStatus.PENDING)
          await this.syncBatchAndCategoryStatus(item.batch_id)
        }
      }
    } catch (err: any) {
      this.logger.warn(`Không thể kiểm tra trạng thái hàng chờ AI lúc khởi động: ${err?.message}`)
    }
  }

  /* ============================================================================
   * 1. CÁC HÀM TIỆN ÍCH CHO 3 MODULE GỌI TRỰC TIẾP
   * ============================================================================ */

  async createStoryBatch(dto: CreateStoryAiBatchDto) {
    return this.createBatch({
      ...dto,
      module_type: AiModuleType.STORY,
      category_id: dto.topic_id,
    })
  }

  async createWitnessFaithBatch(dto: CreateWitnessFaithAiBatchDto) {
    return this.createBatch({
      ...dto,
      module_type: AiModuleType.WITNESS_FAITH,
      category_id: dto.witness_faith_menu_id,
    })
  }

  async createPostCatalogTopBatch(dto: CreatePostCatalogTopAiBatchDto) {
    return this.createBatch({
      ...dto,
      module_type: AiModuleType.POST_CATALOG_TOP,
      category_id: dto.post_catalog_id,
    })
  }

  /* ============================================================================
   * 2. TẠO ĐỢT GEN HÀNG LOẠT (BATCH) & ĐƯA VÀO HÀNG CHỜ
   * ============================================================================ */

  async createBatch(dto: CreateAiBatchDto) {
    const promptText = (dto.prompt || dto.promt || '').trim()
    if (!promptText) {
      throwAppException('AI_GENERATION_FAILED', ErrorCode.AI_GENERATION_FAILED, HttpStatus.BAD_REQUEST, {
        message: 'Prompt không được để trống',
      })
    }

    const rawStartDay = dto.start_day || dto.deadline?.start_day || dto.dealine?.start_day
    const rawEndDay = dto.end_day || dto.deadline?.end_day || dto.dealine?.end_day

    const { startDate, endDate } = this.parseAndValidateDeadline(rawStartDay, rawEndDay)

    const categoryId = this.resolveCategoryId(dto)
    const categoryName = await this.validateAndGetCategoryName(dto.module_type, categoryId)

    const quantity = Number(dto.quantity) || 1
    const isImage = dto.is_image !== undefined ? Boolean(dto.is_image) : true
    const intervalMinutes = Number(dto.interval_minutes) || this.defaultIntervalMinutes

    // Tạo Batch
    const batch = this.batchRepository.create({
      module_type: dto.module_type,
      category_id: categoryId,
      category_name: categoryName,
      prompt: promptText,
      quantity,
      completed_count: 0,
      failed_count: 0,
      is_image: isImage,
      start_day: startDate,
      end_day: endDate,
      interval_minutes: intervalMinutes,
      min_words: 1000,
      max_words: 3000,
      status: AiStatus.PENDING,
    })
    const savedBatch = await this.batchRepository.save(batch)

    // Cập nhật trạng thái AI trên danh mục của module (Topic / WitnessFaithMenu / PostCatalog)
    await this.updateCategoryAiStatus(dto.module_type, categoryId, AiStatus.PENDING)

    // Phân bổ lịch dự kiến (scheduled_at) cho từng bài trong khoảng deadline
    const scheduledTimes = this.calculateScheduleTimes(startDate, endDate, quantity, intervalMinutes)

    const createdItems: AiContentItem[] = []
    for (let i = 0; i < quantity; i++) {
      const seq = i + 1
      const shortPromptPreview = promptText.split(/\s+/).slice(0, 6).join(' ')
      const placeholderTitle = `[Chờ AI #${seq}/${quantity}] ${shortPromptPreview}`

      // Tạo bản ghi giữ chỗ có ai_status = PENDING ngay trong module đích để Admin theo dõi trực tiếp ở 3 module
      const targetRecordId = await this.createPlaceholderInModule({
        moduleType: dto.module_type,
        categoryId,
        batchId: savedBatch.id,
        placeholderTitle,
      })

      const item = this.itemRepository.create({
        batch_id: savedBatch.id,
        module_type: dto.module_type,
        category_id: categoryId,
        sequence_number: seq,
        target_record_id: targetRecordId,
        title: placeholderTitle,
        description: null,
        content: null,
        image_url: null,
        image_source: AiImageSource.NONE,
        word_count: 0,
        is_image: isImage,
        prompt: promptText,
        status: AiStatus.PENDING,
        scheduled_at: scheduledTimes[i],
      })
      createdItems.push(await this.itemRepository.save(item))
    }

    // Kích hoạt chạy ngầm bài đầu tiên nếu đã trong thời gian start_day và hệ thống đang rảnh
    setImmediate(() => {
      this.processNextQueuedItemIfReady().catch(err =>
        this.logger.warn(`Lỗi kích hoạt chạy ngầm sau khi tạo batch: ${err?.message}`),
      )
    })

    return {
      batch: this.formatBatch(savedBatch),
      items: createdItems.map(item => this.formatItemSummary(item)),
    }
  }

  /* ============================================================================
   * 3. CRONJOB TỰ ĐỘNG GEN THEO HÀNG CHỜ (TRÁNH RATE LIMIT MODEL)
   * ============================================================================ */

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCronGenerateNextContent() {
    await this.processNextQueuedItemIfReady()
  }

  /**
   * Kiểm tra điều kiện thời gian tính từ lúc bài cuối cùng gen xong (last_completed_at)
   * và chỉ gen 1 bài mỗi lần để tránh vượt giới hạn (rate limit) của model.
   */
  async processNextQueuedItemIfReady(forceIgnoreCooldown = false): Promise<AiContentItem | null> {
    if (this.isProcessing) {
      return null
    }

    const now = new Date()

    // Tìm các bài đang PENDING thuộc đợt có start_day <= now
    const pendingItems = await this.itemRepository
      .createQueryBuilder('item')
      .innerJoinAndSelect('item.batch', 'batch')
      .where('item.status = :status', { status: AiStatus.PENDING })
      .andWhere('batch.status IN (:...batchStatuses)', {
        batchStatuses: [AiStatus.PENDING, AiStatus.PROCESSING],
      })
      .andWhere('batch.start_day <= :now', { now })
      .orderBy('batch.end_day', 'ASC')
      .addOrderBy('item.scheduled_at', 'ASC')
      .addOrderBy('item.id', 'ASC')
      .limit(5)
      .getMany()

    if (pendingItems.length === 0) {
      return null
    }

    const nextItem = pendingItems[0]
    const batch = nextItem.batch

    if (!forceIgnoreCooldown) {
      // Tìm thời điểm bài cuối cùng được gen xong trên toàn hệ thống
      const lastCompleted = await this.itemRepository
        .createQueryBuilder('item')
        .select('MAX(item.completed_at)', 'lastCompletedAt')
        .where('item.status = :status', { status: AiStatus.COMPLETED })
        .getRawOne()

      const lastCompletedAt = lastCompleted?.lastCompletedAt ? new Date(lastCompleted.lastCompletedAt) : null

      if (lastCompletedAt && !isNaN(lastCompletedAt.getTime())) {
        const elapsedMs = now.getTime() - lastCompletedAt.getTime()
        const requiredCooldownMs = await this.computeEffectiveCooldownMs(batch, now)

        if (elapsedMs < requiredCooldownMs) {
          return null
        }
      }
    }

    return this.executeItemGeneration(nextItem.id)
  }

  /**
   * Thực thi gen 1 bài viết AI (nội dung 1000-3000 từ + ảnh nếu is_image = true)
   * và cập nhật/insert trực tiếp vào module tương ứng.
   */
  async executeItemGeneration(itemId: number, forceRegenerate = false): Promise<AiContentItem> {
    if (this.isProcessing && !forceRegenerate) {
      throwAppException('AI_ARTICLE_CURRENTLY_PROCESSING', ErrorCode.AI_ARTICLE_CURRENTLY_PROCESSING, HttpStatus.BAD_REQUEST)
    }

    const item = await this.itemRepository.findOne({
      where: { id: itemId },
      relations: ['batch'],
    })
    if (!item) {
      throwAppException('AI_ARTICLE_NOT_FOUND', ErrorCode.AI_ARTICLE_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    this.isProcessing = true
    try {
      // 1. Đánh dấu trạng thái PROCESSING trên item, batch, danh mục và bản ghi module
      item.status = AiStatus.PROCESSING
      item.started_at = new Date()
      item.error_message = null
      await this.itemRepository.save(item)

      await this.batchRepository.update(item.batch_id, { status: AiStatus.PROCESSING })
      await this.updateCategoryAiStatus(item.module_type, item.category_id, AiStatus.PROCESSING)
      await this.updateModuleRecordStatus(item.module_type, item.target_record_id, AiStatus.PROCESSING)

      // 2. Lấy danh sách tiêu đề đã có trong cùng đợt để tránh trùng lặp chủ đề/góc nhìn
      const siblingItems = await this.itemRepository.find({
        where: { batch_id: item.batch_id, status: AiStatus.COMPLETED },
        select: ['title', 'image_url'],
      })
      const existingTitles = siblingItems.map(s => s.title).filter((t): t is string => Boolean(t))
      const usedImageUrls = siblingItems.map(s => s.image_url).filter((u): u is string => Boolean(u))

      const categoryName = item.batch?.category_name || (await this.validateAndGetCategoryName(item.module_type, item.category_id))

      // 3. Gọi Gemini 3.5 Flash Lite sinh nội dung (1000 - 3000 từ)
      const generatedArticle = await this.geminiAiService.generateArticleContent({
        moduleType: item.module_type,
        categoryName,
        prompt: item.prompt || item.batch?.prompt,
        sequenceNumber: item.sequence_number,
        totalQuantity: item.batch?.quantity || 1,
        existingTitles,
        minWords: item.batch?.min_words || 1000,
        maxWords: item.batch?.max_words || 3000,
      })

      // 4. Nếu is_image = true, gọi Gemini Image (3.1-flash-lite-image / 2.5-flash-image) + upload server, hoặc tìm link ảnh trên mạng
      let imageUrl: string | null = item.image_url
      let imageSource: AiImageSource = item.image_source || AiImageSource.NONE
      let imagePrompt: string | null = generatedArticle.imagePrompt

      if (item.is_image) {
        const imageResult = await this.geminiAiService.generateOrFallbackImage({
          imagePrompt: generatedArticle.imagePrompt,
          imageSearchKeywords: generatedArticle.imageSearchKeywords,
          moduleType: item.module_type,
          sequenceNumber: item.sequence_number,
          usedImageUrls,
        })
        imageUrl = imageResult.imageUrl
        imageSource = imageResult.imageSource
        imagePrompt = imageResult.imagePrompt
      } else {
        imageUrl = null
        imageSource = AiImageSource.NONE
      }

      // 5. Lưu / Insert nội dung và ảnh vừa tạo vào bảng của module tương ứng (stories, witness_faiths, posts)
      const savedTargetId = await this.upsertModuleRecord({
        moduleType: item.module_type,
        targetRecordId: item.target_record_id,
        categoryId: item.category_id,
        batchId: item.batch_id,
        title: generatedArticle.title,
        description: generatedArticle.description,
        content: generatedArticle.content,
        imageUrl,
        aiStatus: AiStatus.COMPLETED,
      })

      // 6. Cập nhật AiContentItem sang COMPLETED
      const completedAt = new Date()
      item.target_record_id = savedTargetId
      item.title = generatedArticle.title
      item.description = generatedArticle.description
      item.content = generatedArticle.content
      item.word_count = generatedArticle.wordCount
      item.image_url = imageUrl
      item.image_source = imageSource
      item.image_prompt = imagePrompt
      item.status = AiStatus.COMPLETED
      item.completed_at = completedAt
      item.error_message = null
      const savedItem = await this.itemRepository.save(item)

      await this.batchRepository.update(item.batch_id, {
        last_completed_at: completedAt,
        last_error: null,
      })

      // 7. Đồng bộ tiến độ của Batch và trạng thái AI của danh mục
      await this.syncBatchAndCategoryStatus(item.batch_id)

      this.logger.log(
        `[AI COMPLETED] Module=${item.module_type} | Batch=#${item.batch_id} | Bài=${item.sequence_number}/${item.batch?.quantity} | Words=${generatedArticle.wordCount} | Image=${imageSource} | TargetID=${savedTargetId}`,
      )

      return savedItem
    } catch (error: any) {
      const errMsg = error?.message || 'Lỗi không xác định khi gen nội dung AI'
      this.logger.error(`[AI ERROR] Item #${item.id} (Batch #${item.batch_id}): ${errMsg}`)

      item.retry_count = (item.retry_count || 0) + 1
      item.error_message = errMsg

      // Tự động đưa về PENDING để thử lại ở các chu kỳ cron tiếp theo nếu chưa vượt quá 3 lần thử
      if (item.retry_count < 3 && !forceRegenerate) {
        item.status = AiStatus.PENDING
        await this.updateModuleRecordStatus(item.module_type, item.target_record_id, AiStatus.PENDING)
      } else {
        item.status = AiStatus.FAILED
        await this.updateModuleRecordStatus(item.module_type, item.target_record_id, AiStatus.FAILED)
      }

      await this.itemRepository.save(item)
      await this.batchRepository.update(item.batch_id, { last_error: errMsg })
      await this.syncBatchAndCategoryStatus(item.batch_id)

      if (forceRegenerate) {
        throwAppException('AI_GENERATION_FAILED', ErrorCode.AI_GENERATION_FAILED, HttpStatus.INTERNAL_SERVER_ERROR, {
          reason: errMsg,
        })
      }
      return item
    } finally {
      this.isProcessing = false
    }
  }

  /* ============================================================================
   * 4. BỘ API QUẢN LÝ BÀI VIẾT & ĐỢT GEN AI (DASHBOARD, BATCHES, ARTICLES)
   * ============================================================================ */

  async getStats() {
    const [totalBatches, pendingBatches, processingBatches, completedBatches, failedBatches] = await Promise.all([
      this.batchRepository.count(),
      this.batchRepository.count({ where: { status: AiStatus.PENDING } }),
      this.batchRepository.count({ where: { status: AiStatus.PROCESSING } }),
      this.batchRepository.count({ where: { status: AiStatus.COMPLETED } }),
      this.batchRepository.count({ where: { status: AiStatus.FAILED } }),
    ])

    const [totalArticles, pendingArticles, processingArticles, completedArticles, failedArticles] = await Promise.all([
      this.itemRepository.count(),
      this.itemRepository.count({ where: { status: AiStatus.PENDING } }),
      this.itemRepository.count({ where: { status: AiStatus.PROCESSING } }),
      this.itemRepository.count({ where: { status: AiStatus.COMPLETED } }),
      this.itemRepository.count({ where: { status: AiStatus.FAILED } }),
    ])

    const byModuleRaw = await this.itemRepository
      .createQueryBuilder('item')
      .select('item.module_type', 'module_type')
      .addSelect('item.status', 'status')
      .addSelect('COUNT(item.id)', 'count')
      .groupBy('item.module_type')
      .addGroupBy('item.status')
      .getRawMany()

    const moduleBreakdown: Record<string, Record<string, number>> = {
      [AiModuleType.STORY]: { TOTAL: 0, PENDING: 0, PROCESSING: 0, COMPLETED: 0, FAILED: 0, CANCELLED: 0 },
      [AiModuleType.WITNESS_FAITH]: { TOTAL: 0, PENDING: 0, PROCESSING: 0, COMPLETED: 0, FAILED: 0, CANCELLED: 0 },
      [AiModuleType.POST_CATALOG_TOP]: { TOTAL: 0, PENDING: 0, PROCESSING: 0, COMPLETED: 0, FAILED: 0, CANCELLED: 0 },
    }

    for (const row of byModuleRaw) {
      const mod = row.module_type
      const st = row.status
      const cnt = Number(row.count) || 0
      if (!moduleBreakdown[mod]) {
        moduleBreakdown[mod] = { TOTAL: 0, PENDING: 0, PROCESSING: 0, COMPLETED: 0, FAILED: 0, CANCELLED: 0 }
      }
      moduleBreakdown[mod][st] = cnt
      moduleBreakdown[mod].TOTAL += cnt
    }

    const lastCompletedRow = await this.itemRepository
      .createQueryBuilder('item')
      .select('MAX(item.completed_at)', 'lastCompletedAt')
      .where('item.status = :status', { status: AiStatus.COMPLETED })
      .getRawOne()

    const lastCompletedAt = lastCompletedRow?.lastCompletedAt ? new Date(lastCompletedRow.lastCompletedAt) : null
    const nextPendingItem = await this.itemRepository.findOne({
      where: { status: AiStatus.PENDING },
      relations: ['batch'],
      order: { scheduled_at: 'ASC', id: 'ASC' },
    })

    let nextEstimatedRunAt: string | null = null
    if (nextPendingItem) {
      const intervalMs = (nextPendingItem.batch?.interval_minutes || this.defaultIntervalMinutes) * 60 * 1000
      const baseTime = lastCompletedAt ? new Date(lastCompletedAt.getTime() + intervalMs) : new Date()
      const batchStart = nextPendingItem.batch?.start_day ? new Date(nextPendingItem.batch.start_day) : new Date()
      const effectiveNext = new Date(Math.max(Date.now(), baseTime.getTime(), batchStart.getTime()))
      nextEstimatedRunAt = effectiveNext.toISOString()
    }

    return {
      worker: {
        is_processing: this.isProcessing,
        content_model: process.env.GEMINI_CONTENT_MODEL || 'gemini-3.5-flash-lite',
        image_models: (process.env.GEMINI_IMAGE_MODELS || 'gemini-3.1-flash-lite-image,gemini-2.5-flash-image').split(','),
        default_interval_minutes: this.defaultIntervalMinutes,
        last_completed_at: lastCompletedAt ? lastCompletedAt.toISOString() : null,
        next_estimated_run_at: nextEstimatedRunAt,
      },
      batches: {
        total: totalBatches,
        pending: pendingBatches,
        processing: processingBatches,
        completed: completedBatches,
        failed: failedBatches,
      },
      articles: {
        total: totalArticles,
        pending: pendingArticles,
        processing: processingArticles,
        completed: completedArticles,
        failed: failedArticles,
      },
      by_module: moduleBreakdown,
    }
  }

  async getBatches(paginateDto: PaginateAiBatchDto): Promise<{ data: any[]; meta: PaginationMeta }> {
    const { module_type, status, category_id, search, page = 1, limit = 10, orderBy = 'created_at', orderDirection = 'DESC' } = paginateDto
    const qb = this.batchRepository.createQueryBuilder('batch')

    if (module_type) {
      qb.andWhere('batch.module_type = :module_type', { module_type })
    }
    if (status) {
      qb.andWhere('batch.status = :status', { status })
    }
    if (category_id) {
      qb.andWhere('batch.category_id = :category_id', { category_id: Number(category_id) })
    }
    if (search) {
      qb.andWhere('(LOWER(batch.prompt) LIKE :search OR LOWER(batch.category_name) LIKE :search)', {
        search: `%${search.toLowerCase().trim()}%`,
      })
    }

    const { data, meta } = await paginate(qb, { page, limit, orderBy, orderDirection })
    return {
      data: data.map(b => this.formatBatch(b)),
      meta,
    }
  }

  async getBatchById(id: number) {
    const batch = await this.batchRepository.findOne({
      where: { id },
      relations: ['items'],
    })
    if (!batch) {
      throwAppException('AI_BATCH_NOT_FOUND', ErrorCode.AI_BATCH_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    const sortedItems = (batch.items || []).sort((a, b) => a.sequence_number - b.sequence_number)
    return {
      ...this.formatBatch(batch),
      items: sortedItems.map(item => this.formatItemSummary(item)),
    }
  }

  async updateBatch(id: number, dto: UpdateAiBatchDto) {
    const batch = await this.batchRepository.findOne({ where: { id } })
    if (!batch) {
      throwAppException('AI_BATCH_NOT_FOUND', ErrorCode.AI_BATCH_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    const newPrompt = (dto.prompt || dto.promt)?.trim()
    if (newPrompt) {
      batch.prompt = newPrompt
    }
    if (dto.is_image !== undefined) {
      batch.is_image = Boolean(dto.is_image)
    }
    if (dto.interval_minutes !== undefined) {
      batch.interval_minutes = Number(dto.interval_minutes)
    }
    if (dto.start_day || dto.end_day) {
      const startStr = dto.start_day || batch.start_day.toISOString()
      const endStr = dto.end_day || batch.end_day.toISOString()
      const { startDate, endDate } = this.parseAndValidateDeadline(startStr, endStr)
      batch.start_day = startDate
      batch.end_day = endDate
    }

    const savedBatch = await this.batchRepository.save(batch)

    // Cập nhật cho các item đang PENDING trong batch
    const pendingItems = await this.itemRepository.find({
      where: { batch_id: id, status: AiStatus.PENDING },
      order: { sequence_number: 'ASC' },
    })

    if (pendingItems.length > 0) {
      const newSchedules = this.calculateScheduleTimes(
        savedBatch.start_day,
        savedBatch.end_day,
        pendingItems.length,
        savedBatch.interval_minutes,
      )
      for (let i = 0; i < pendingItems.length; i++) {
        if (newPrompt) pendingItems[i].prompt = newPrompt
        if (dto.is_image !== undefined) pendingItems[i].is_image = Boolean(dto.is_image)
        pendingItems[i].scheduled_at = newSchedules[i]
      }
      await this.itemRepository.save(pendingItems)
    }

    return this.getBatchById(id)
  }

  async cancelBatch(id: number) {
    const batch = await this.batchRepository.findOne({ where: { id } })
    if (!batch) {
      throwAppException('AI_BATCH_NOT_FOUND', ErrorCode.AI_BATCH_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    const pendingItems = await this.itemRepository.find({
      where: { batch_id: id, status: AiStatus.PENDING },
    })

    for (const item of pendingItems) {
      item.status = AiStatus.CANCELLED
      await this.itemRepository.save(item)
      // Xóa bản ghi giữ chỗ chưa được tạo nội dung trong module để tránh rác
      await this.deleteModuleRecord(item.module_type, item.target_record_id)
      item.target_record_id = null
      await this.itemRepository.save(item)
    }

    await this.syncBatchAndCategoryStatus(id)
    return this.getBatchById(id)
  }

  async retryFailedInBatch(id: number) {
    const batch = await this.batchRepository.findOne({ where: { id } })
    if (!batch) {
      throwAppException('AI_BATCH_NOT_FOUND', ErrorCode.AI_BATCH_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    const failedItems = await this.itemRepository.find({
      where: { batch_id: id, status: In([AiStatus.FAILED, AiStatus.CANCELLED]) },
    })

    for (const item of failedItems) {
      item.status = AiStatus.PENDING
      item.retry_count = 0
      item.error_message = null
      if (!item.target_record_id) {
        item.target_record_id = await this.createPlaceholderInModule({
          moduleType: item.module_type,
          categoryId: item.category_id,
          batchId: item.batch_id,
          placeholderTitle: item.title || `[AI đang chờ tạo #${item.sequence_number}]`,
        })
      } else {
        await this.updateModuleRecordStatus(item.module_type, item.target_record_id, AiStatus.PENDING)
      }
      await this.itemRepository.save(item)
    }

    await this.syncBatchAndCategoryStatus(id)

    setImmediate(() => {
      this.processNextQueuedItemIfReady().catch(() => undefined)
    })

    return this.getBatchById(id)
  }

  async deleteBatch(id: number, deleteModuleRecords = false) {
    const batch = await this.batchRepository.findOne({
      where: { id },
      relations: ['items'],
    })
    if (!batch) {
      throwAppException('AI_BATCH_NOT_FOUND', ErrorCode.AI_BATCH_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    for (const item of batch.items || []) {
      // Luôn xóa các bản ghi giữ chỗ chưa hoàn thành, hoặc xóa tất cả nếu deleteModuleRecords = true
      if (deleteModuleRecords || item.status !== AiStatus.COMPLETED) {
        await this.deleteModuleRecord(item.module_type, item.target_record_id)
      }
    }

    await this.batchRepository.delete(id)
    await this.refreshCategoryStatusAfterChange(batch.module_type, batch.category_id)
  }

  async getArticles(paginateDto: PaginateAiArticleDto): Promise<{ data: any[]; meta: PaginationMeta }> {
    const {
      module_type,
      status,
      batch_id,
      category_id,
      image_source,
      is_image,
      search,
      page = 1,
      limit = 10,
      orderBy = 'created_at',
      orderDirection = 'DESC',
    } = paginateDto

    const qb = this.itemRepository.createQueryBuilder('item').leftJoinAndSelect('item.batch', 'batch')

    if (module_type) {
      qb.andWhere('item.module_type = :module_type', { module_type })
    }
    if (status) {
      qb.andWhere('item.status = :status', { status })
    }
    if (batch_id) {
      qb.andWhere('item.batch_id = :batch_id', { batch_id: Number(batch_id) })
    }
    if (category_id) {
      qb.andWhere('item.category_id = :category_id', { category_id: Number(category_id) })
    }
    if (image_source) {
      qb.andWhere('item.image_source = :image_source', { image_source })
    }
    if (is_image !== undefined) {
      qb.andWhere('item.is_image = :is_image', { is_image: is_image ? 1 : 0 })
    }
    if (search) {
      qb.andWhere('(LOWER(item.title) LIKE :search OR LOWER(item.prompt) LIKE :search)', {
        search: `%${search.toLowerCase().trim()}%`,
      })
    }

    const { data, meta } = await paginate(qb, { page, limit, orderBy, orderDirection })

    return {
      data: data.map(item => this.formatItemSummary(item, true)),
      meta,
    }
  }

  async getArticleById(id: number) {
    const item = await this.itemRepository.findOne({
      where: { id },
      relations: ['batch'],
    })
    if (!item) {
      throwAppException('AI_ARTICLE_NOT_FOUND', ErrorCode.AI_ARTICLE_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    const moduleRecord = await this.getModuleRecord(item.module_type, item.target_record_id)
    return {
      ...this.formatItemDetail(item),
      module_record: moduleRecord,
    }
  }

  /**
   * Cập nhật bài viết AI và tự động đồng bộ sang bảng của module tương ứng (stories, witness_faiths, posts).
   */
  async updateArticle(id: number, dto: UpdateAiArticleDto) {
    const item = await this.itemRepository.findOne({
      where: { id },
      relations: ['batch'],
    })
    if (!item) {
      throwAppException('AI_ARTICLE_NOT_FOUND', ErrorCode.AI_ARTICLE_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    if (dto.category_id !== undefined && dto.category_id !== item.category_id) {
      await this.validateAndGetCategoryName(item.module_type, dto.category_id)
      item.category_id = Number(dto.category_id)
    }
    if (dto.title !== undefined) {
      item.title = dto.title
    }
    if (dto.description !== undefined) {
      item.description = dto.description
    }
    if (dto.content !== undefined) {
      item.content = dto.content
      item.word_count = this.geminiAiService.countWords(dto.content)
    }
    if (dto.image_url !== undefined) {
      item.image_url = dto.image_url
      item.image_source = dto.image_url ? AiImageSource.MANUAL : AiImageSource.NONE
    }
    if (dto.prompt !== undefined) {
      item.prompt = dto.prompt
    }
    if (dto.is_image !== undefined) {
      item.is_image = Boolean(dto.is_image)
    }

    const savedItem = await this.itemRepository.save(item)

    // Đồng bộ trực tiếp sang bảng của module (Story / WitnessFaith / Post)
    if (savedItem.target_record_id || savedItem.status === AiStatus.COMPLETED) {
      const targetId = await this.upsertModuleRecord({
        moduleType: savedItem.module_type,
        targetRecordId: savedItem.target_record_id,
        categoryId: savedItem.category_id,
        batchId: savedItem.batch_id,
        title: savedItem.title || 'Bài viết AI',
        description: savedItem.description || '',
        content: savedItem.content || '',
        imageUrl: savedItem.image_url,
        aiStatus: savedItem.status,
      })
      if (targetId !== savedItem.target_record_id) {
        savedItem.target_record_id = targetId
        await this.itemRepository.save(savedItem)
      }
    }

    return this.getArticleById(id)
  }

  /**
   * Yêu cầu AI gen ngay (hoặc gen lại mới) cho 1 bài viết cụ thể.
   */
  async regenerateArticleNow(id: number) {
    await this.executeItemGeneration(id, true)
    return this.getArticleById(id)
  }

  /**
   * Yêu cầu AI gen lại riêng hình ảnh cho bài viết và cập nhật vào module.
   */
  async regenerateArticleImage(id: number) {
    const item = await this.itemRepository.findOne({
      where: { id },
      relations: ['batch'],
    })
    if (!item) {
      throwAppException('AI_ARTICLE_NOT_FOUND', ErrorCode.AI_ARTICLE_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    const promptForImg = item.image_prompt || `Peaceful editorial illustration for article: ${item.title || item.prompt}`
    const imageResult = await this.geminiAiService.generateOrFallbackImage({
      imagePrompt: promptForImg,
      imageSearchKeywords: item.title || 'catholic faith study',
      moduleType: item.module_type,
      sequenceNumber: item.sequence_number,
    })

    item.image_url = imageResult.imageUrl
    item.image_source = imageResult.imageSource
    item.is_image = true
    await this.itemRepository.save(item)

    if (item.target_record_id) {
      await this.upsertModuleRecord({
        moduleType: item.module_type,
        targetRecordId: item.target_record_id,
        categoryId: item.category_id,
        batchId: item.batch_id,
        title: item.title || 'Bài viết AI',
        description: item.description || '',
        content: item.content || '',
        imageUrl: item.image_url,
        aiStatus: item.status,
      })
    }

    return this.getArticleById(id)
  }

  /**
   * Xóa 1 bài viết AI và xóa luôn bản ghi tương ứng trong module.
   */
  async deleteArticle(id: number) {
    const item = await this.itemRepository.findOne({ where: { id } })
    if (!item) {
      throwAppException('AI_ARTICLE_NOT_FOUND', ErrorCode.AI_ARTICLE_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    await this.deleteModuleRecord(item.module_type, item.target_record_id)
    await this.itemRepository.delete(id)
    await this.syncBatchAndCategoryStatus(item.batch_id)
  }

  /* ============================================================================
   * 5. ĐỒNG BỘ DỮ LIỆU VÀ TRẠNG THÁI VỚI 3 MODULE (STORY, WITNESS-FAITHS, POST-CATALOG-TOP)
   * ============================================================================ */

  private async createPlaceholderInModule(params: {
    moduleType: AiModuleType
    categoryId: number
    batchId: number
    placeholderTitle: string
  }): Promise<number> {
    const { moduleType, categoryId, batchId, placeholderTitle } = params

    switch (moduleType) {
      case AiModuleType.STORY: {
        const storyMaxIndex = await this.storyRepository.createQueryBuilder('story').select('MAX(story.index) as maxIndex').getRawOne()
        const maxIndex = storyMaxIndex?.maxIndex ? Number(storyMaxIndex.maxIndex) + 100 : 1.0001
        const story = this.storyRepository.create({
          title: placeholderTitle,
          thumbnail: null,
          content: '',
          topic_id: categoryId,
          index: maxIndex,
          ai_status: AiStatus.PENDING,
          ai_batch_id: batchId,
        })
        const saved = await this.storyRepository.save(story)
        return saved.id
      }

      case AiModuleType.WITNESS_FAITH: {
        const wf = this.witnessFaithRepository.create({
          name: placeholderTitle,
          image: null,
          description: null,
          content: '',
          witness_faith_menu_id: categoryId,
          ai_status: AiStatus.PENDING,
          ai_batch_id: batchId,
        })
        const saved = await this.witnessFaithRepository.save(wf)
        return saved.id
      }

      case AiModuleType.POST_CATALOG_TOP: {
        const postMaxIndex = await this.postRepository.createQueryBuilder('post').select('MAX(post.index) as maxIndex').getRawOne()
        const maxIndex = postMaxIndex?.maxIndex ? Number(postMaxIndex.maxIndex) + 100 : 1.0001
        const slug = `${convertToSlug(placeholderTitle)}-${Date.now()}`
        const post = this.postRepository.create({
          title: placeholderTitle,
          slug: slug.slice(0, 250),
          description: null,
          content: '',
          image: null,
          is_active: false, // Ẩn với user cho tới khi AI gen xong
          is_banner: true,
          is_kiot: false,
          post_catalog_id: categoryId,
          index: maxIndex,
          ai_status: AiStatus.PENDING,
          ai_batch_id: batchId,
        })
        const saved = await this.postRepository.save(post)
        return saved.id
      }
    }
  }

  private async upsertModuleRecord(params: {
    moduleType: AiModuleType
    targetRecordId: number | null
    categoryId: number
    batchId: number
    title: string
    description: string
    content: string
    imageUrl: string | null
    aiStatus: AiStatus
  }): Promise<number> {
    const { moduleType, targetRecordId, categoryId, batchId, title, description, content, imageUrl, aiStatus } = params

    switch (moduleType) {
      case AiModuleType.STORY: {
        let story = targetRecordId ? await this.storyRepository.findOne({ where: { id: targetRecordId } }) : null
        if (!story) {
          const storyMaxIndex = await this.storyRepository.createQueryBuilder('story').select('MAX(story.index) as maxIndex').getRawOne()
          const maxIndex = storyMaxIndex?.maxIndex ? Number(storyMaxIndex.maxIndex) + 100 : 1.0001
          story = this.storyRepository.create({
            index: maxIndex,
            topic_id: categoryId,
            ai_batch_id: batchId,
          })
        }
        story.title = title
        story.thumbnail = imageUrl || ''
        story.content = content
        story.topic_id = categoryId
        story.ai_status = aiStatus
        story.ai_batch_id = batchId
        const saved = await this.storyRepository.save(story)
        return saved.id
      }

      case AiModuleType.WITNESS_FAITH: {
        let wf = targetRecordId ? await this.witnessFaithRepository.findOne({ where: { id: targetRecordId } }) : null
        if (!wf) {
          wf = this.witnessFaithRepository.create({
            witness_faith_menu_id: categoryId,
            ai_batch_id: batchId,
          })
        }
        wf.name = title
        wf.image = imageUrl
        wf.description = description
        wf.content = content
        wf.witness_faith_menu_id = categoryId
        wf.ai_status = aiStatus
        wf.ai_batch_id = batchId
        const saved = await this.witnessFaithRepository.save(wf)
        return saved.id
      }

      case AiModuleType.POST_CATALOG_TOP: {
        let post = targetRecordId ? await this.postRepository.findOne({ where: { id: targetRecordId } }) : null
        if (!post) {
          const postMaxIndex = await this.postRepository.createQueryBuilder('post').select('MAX(post.index) as maxIndex').getRawOne()
          const maxIndex = postMaxIndex?.maxIndex ? Number(postMaxIndex.maxIndex) + 100 : 1.0001
          post = this.postRepository.create({
            index: maxIndex,
            is_banner: true,
            is_kiot: false,
            post_catalog_id: categoryId,
            ai_batch_id: batchId,
          })
        }
        post.title = title
        post.slug = convertToSlug(title).slice(0, 250)
        post.description = description
        post.content = content
        post.image = imageUrl
        post.post_catalog_id = categoryId
        post.is_active = aiStatus === AiStatus.COMPLETED
        post.ai_status = aiStatus
        post.ai_batch_id = batchId
        const saved = await this.postRepository.save(post)
        return saved.id
      }
    }
  }

  private async updateModuleRecordStatus(moduleType: AiModuleType, targetRecordId: number | null, status: AiStatus) {
    if (!targetRecordId) return
    switch (moduleType) {
      case AiModuleType.STORY:
        await this.storyRepository.update(targetRecordId, { ai_status: status })
        break
      case AiModuleType.WITNESS_FAITH:
        await this.witnessFaithRepository.update(targetRecordId, { ai_status: status })
        break
      case AiModuleType.POST_CATALOG_TOP:
        await this.postRepository.update(targetRecordId, { ai_status: status })
        break
    }
  }

  private async deleteModuleRecord(moduleType: AiModuleType, targetRecordId: number | null) {
    if (!targetRecordId) return
    try {
      switch (moduleType) {
        case AiModuleType.STORY:
          await this.storyRepository.delete(targetRecordId)
          break
        case AiModuleType.WITNESS_FAITH:
          await this.witnessFaithRepository.delete(targetRecordId)
          break
        case AiModuleType.POST_CATALOG_TOP:
          await this.postRepository.delete(targetRecordId)
          break
      }
    } catch (err: any) {
      this.logger.warn(`Không thể xóa bản ghi #${targetRecordId} ở module ${moduleType}: ${err?.message}`)
    }
  }

  private async getModuleRecord(moduleType: AiModuleType, targetRecordId: number | null): Promise<any> {
    if (!targetRecordId) return null
    switch (moduleType) {
      case AiModuleType.STORY:
        return this.storyRepository.findOne({ where: { id: targetRecordId }, relations: ['topic'] })
      case AiModuleType.WITNESS_FAITH:
        return this.witnessFaithRepository.findOne({ where: { id: targetRecordId }, relations: ['witness_faith_menu'] })
      case AiModuleType.POST_CATALOG_TOP:
        return this.postRepository.findOne({ where: { id: targetRecordId }, relations: ['post_catalog'] })
    }
  }

  private async updateCategoryAiStatus(moduleType: AiModuleType, categoryId: number, status: AiStatus | null) {
    if (!categoryId) return
    switch (moduleType) {
      case AiModuleType.STORY:
        await this.topicRepository.update(categoryId, { ai_status: status })
        break
      case AiModuleType.WITNESS_FAITH:
        await this.witnessFaithMenuRepository.update(categoryId, { ai_status: status })
        break
      case AiModuleType.POST_CATALOG_TOP:
        await this.postCatalogRepository.update(categoryId, { ai_status: status })
        break
    }
  }

  private async syncBatchAndCategoryStatus(batchId: number) {
    const batch = await this.batchRepository.findOne({ where: { id: batchId } })
    if (!batch) return

    const items = await this.itemRepository.find({ where: { batch_id: batchId } })
    const completedCount = items.filter(i => i.status === AiStatus.COMPLETED).length
    const failedCount = items.filter(i => i.status === AiStatus.FAILED).length
    const processingCount = items.filter(i => i.status === AiStatus.PROCESSING).length
    const pendingCount = items.filter(i => i.status === AiStatus.PENDING).length
    const cancelledCount = items.filter(i => i.status === AiStatus.CANCELLED).length

    let nextStatus: AiStatus = AiStatus.PENDING
    if (processingCount > 0) {
      nextStatus = AiStatus.PROCESSING
    } else if (pendingCount > 0) {
      nextStatus = AiStatus.PENDING
    } else if (completedCount > 0) {
      nextStatus = AiStatus.COMPLETED
    } else if (failedCount > 0) {
      nextStatus = AiStatus.FAILED
    } else if (cancelledCount > 0 && items.length === cancelledCount) {
      nextStatus = AiStatus.CANCELLED
    } else {
      nextStatus = AiStatus.COMPLETED
    }

    batch.completed_count = completedCount
    batch.failed_count = failedCount
    batch.status = nextStatus
    await this.batchRepository.save(batch)

    await this.refreshCategoryStatusAfterChange(batch.module_type, batch.category_id)
  }

  private async refreshCategoryStatusAfterChange(moduleType: AiModuleType, categoryId: number) {
    if (!categoryId) return
    const batches = await this.batchRepository.find({
      where: { module_type: moduleType, category_id: categoryId },
      order: { created_at: 'DESC' },
    })

    if (batches.length === 0) {
      await this.updateCategoryAiStatus(moduleType, categoryId, null)
      return
    }

    if (batches.some(b => b.status === AiStatus.PROCESSING)) {
      await this.updateCategoryAiStatus(moduleType, categoryId, AiStatus.PROCESSING)
    } else if (batches.some(b => b.status === AiStatus.PENDING)) {
      await this.updateCategoryAiStatus(moduleType, categoryId, AiStatus.PENDING)
    } else if (batches.some(b => b.status === AiStatus.COMPLETED)) {
      await this.updateCategoryAiStatus(moduleType, categoryId, AiStatus.COMPLETED)
    } else {
      await this.updateCategoryAiStatus(moduleType, categoryId, batches[0].status)
    }
  }

  /* ============================================================================
   * 6. VALIDATION & TIME HELPERS
   * ============================================================================ */

  private resolveCategoryId(dto: CreateAiBatchDto): number {
    const id =
      dto.category_id ??
      (dto.module_type === AiModuleType.STORY
        ? dto.topic_id
        : dto.module_type === AiModuleType.WITNESS_FAITH
          ? dto.witness_faith_menu_id
          : dto.post_catalog_id)

    if (!id || isNaN(Number(id))) {
      throwAppException('AI_CATEGORY_REQUIRED', ErrorCode.AI_CATEGORY_REQUIRED, HttpStatus.BAD_REQUEST)
    }
    return Number(id)
  }

  private async validateAndGetCategoryName(moduleType: AiModuleType, categoryId: number): Promise<string> {
    switch (moduleType) {
      case AiModuleType.STORY: {
        const topic = await this.topicRepository.findOne({ where: { id: categoryId } })
        if (!topic) {
          throwAppException('TOPIC_NOT_FOUND', ErrorCode.TOPIC_NOT_FOUND, HttpStatus.NOT_FOUND)
        }
        return topic.name
      }
      case AiModuleType.WITNESS_FAITH: {
        const menu = await this.witnessFaithMenuRepository.findOne({ where: { id: categoryId } })
        if (!menu) {
          throwAppException('WITNESS_FAITH_MENU_NOT_FOUND', ErrorCode.WITNESS_FAITH_MENU_NOT_FOUND, HttpStatus.NOT_FOUND)
        }
        return menu.name
      }
      case AiModuleType.POST_CATALOG_TOP: {
        const catalog = await this.postCatalogRepository.findOne({
          where: { id: categoryId, type: PostCatalogType.TOP },
        })
        if (!catalog) {
          throwAppException('POST_CATALOG_NOT_FOUND', ErrorCode.POST_CATALOG_NOT_FOUND, HttpStatus.NOT_FOUND)
        }
        return catalog.name
      }
      default:
        throwAppException('AI_INVALID_MODULE_TYPE', ErrorCode.AI_INVALID_MODULE_TYPE, HttpStatus.BAD_REQUEST)
    }
  }

  private parseAndValidateDeadline(rawStart?: string, rawEnd?: string): { startDate: Date; endDate: Date } {
    const now = new Date()
    const startDate = rawStart ? formatStringToDate(rawStart) : now
    let endDate = rawEnd ? formatStringToDate(rawEnd) : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throwAppException('AI_INVALID_DEADLINE', ErrorCode.AI_INVALID_DEADLINE, HttpStatus.BAD_REQUEST)
    }

    // Nếu end_day được truyền dạng ngày không có giờ (00:00:00), đưa về cuối ngày 23:59:59.999
    if (
      endDate.getHours() === 0 &&
      endDate.getMinutes() === 0 &&
      endDate.getSeconds() === 0 &&
      (!rawEnd || !rawEnd.includes('T'))
    ) {
      endDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999)
    }

    if (startDate.getTime() > endDate.getTime()) {
      throwAppException('START_DATE_MUST_BE_BEFORE_END_DATE', ErrorCode.START_DATE_MUST_BE_BEFORE_END_DATE, HttpStatus.BAD_REQUEST)
    }

    return { startDate, endDate }
  }

  private calculateScheduleTimes(startDate: Date, endDate: Date, quantity: number, intervalMinutes: number): Date[] {
    const now = new Date()
    const effectiveStart = new Date(Math.max(now.getTime(), startDate.getTime()))
    const stepMs = Math.max(60 * 1000, intervalMinutes * 60 * 1000)

    const times: Date[] = []
    for (let i = 0; i < quantity; i++) {
      const scheduled = new Date(effectiveStart.getTime() + i * stepMs)
      times.push(scheduled)
    }
    return times
  }

  private async computeEffectiveCooldownMs(batch: AiContentBatch, now: Date): Promise<number> {
    const baseCooldownMs = Math.max(1, batch.interval_minutes || this.defaultIntervalMinutes) * 60 * 1000
    const remainingPending = await this.itemRepository.count({
      where: { batch_id: batch.id, status: AiStatus.PENDING },
    })

    if (remainingPending <= 0) return baseCooldownMs

    const timeUntilDeadlineMs = new Date(batch.end_day).getTime() - now.getTime()
    if (timeUntilDeadlineMs <= 0) {
      // Đã sát hoặc qua hạn chót: dùng khoảng nghỉ tối thiểu 60 giây để vẫn bảo vệ rate-limit model
      return 60 * 1000
    }

    const dynamicSlotMs = Math.floor(timeUntilDeadlineMs / remainingPending)
    // Chọn khoảng chờ nhỏ hơn giữa interval_minutes và khoảng chia đều theo deadline, nhưng tối thiểu 60 giây
    return Math.max(60 * 1000, Math.min(baseCooldownMs, dynamicSlotMs))
  }

  private formatBatch(batch: AiContentBatch) {
    const pendingCount = Math.max(0, batch.quantity - (batch.completed_count || 0) - (batch.failed_count || 0))
    return {
      id: batch.id,
      module_type: batch.module_type,
      category_id: batch.category_id,
      category_name: batch.category_name,
      prompt: batch.prompt,
      quantity: batch.quantity,
      completed_count: batch.completed_count,
      failed_count: batch.failed_count,
      pending_count: pendingCount,
      is_image: batch.is_image,
      deadline: {
        start_day: batch.start_day ? formatStringDate(batch.start_day.toISOString(), true) : null,
        end_day: batch.end_day ? formatStringDate(batch.end_day.toISOString(), true) : null,
        start_iso: batch.start_day ? batch.start_day.toISOString() : null,
        end_iso: batch.end_day ? batch.end_day.toISOString() : null,
      },
      interval_minutes: batch.interval_minutes,
      word_range: `${batch.min_words}-${batch.max_words}`,
      status: batch.status,
      last_completed_at: batch.last_completed_at ? batch.last_completed_at.toISOString() : null,
      last_error: batch.last_error,
      created_at: batch.created_at ? formatStringDate(batch.created_at.toISOString()) : null,
      updated_at: batch.updated_at ? formatStringDate(batch.updated_at.toISOString()) : null,
    }
  }

  private formatItemSummary(item: AiContentItem, includeBatchInfo = false) {
    return {
      id: item.id,
      batch_id: item.batch_id,
      module_type: item.module_type,
      category_id: item.category_id,
      category_name: item.batch?.category_name || null,
      sequence_number: item.sequence_number,
      target_record_id: item.target_record_id,
      title: item.title,
      description: item.description,
      image_url: item.image_url,
      image_source: item.image_source,
      word_count: item.word_count,
      is_image: item.is_image,
      status: item.status,
      scheduled_at: item.scheduled_at ? item.scheduled_at.toISOString() : null,
      started_at: item.started_at ? item.started_at.toISOString() : null,
      completed_at: item.completed_at ? item.completed_at.toISOString() : null,
      retry_count: item.retry_count,
      error_message: item.error_message,
      created_at: item.created_at ? formatStringDate(item.created_at.toISOString()) : null,
      ...(includeBatchInfo && item.batch
        ? {
            batch: {
              id: item.batch.id,
              prompt: item.batch.prompt,
              quantity: item.batch.quantity,
              completed_count: item.batch.completed_count,
              status: item.batch.status,
            },
          }
        : {}),
    }
  }

  private formatItemDetail(item: AiContentItem) {
    return {
      ...this.formatItemSummary(item, true),
      prompt: item.prompt,
      image_prompt: item.image_prompt,
      content: item.content,
    }
  }
}

