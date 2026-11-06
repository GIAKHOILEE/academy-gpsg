import { ResponseDto } from '@common/response.dto'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Put, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger'
import { AiContentService } from './ai-content.service'
import { CreateAiBatchDto } from './dtos/create-ai-batch.dto'
import { PaginateAiArticleDto } from './dtos/paginate-ai-article.dto'
import { PaginateAiBatchDto } from './dtos/paginate-ai-batch.dto'
import { UpdateAiArticleDto } from './dtos/update-ai-article.dto'
import { UpdateAiBatchDto } from './dtos/update-ai-batch.dto'

@ApiTags('Admin AI Content Management')
@Controller('admin/ai-content')
@ApiBearerAuth()
@Auth(Role.ADMIN, Role.STAFF)
export class AiContentController {
  constructor(private readonly aiContentService: AiContentService) {}

  /* ========================== DASHBOARD / THỐNG KÊ ========================== */

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê tổng quan tiến độ và trạng thái bài viết AI trên cả 3 module' })
  async getStats(): Promise<ResponseDto> {
    const data = await this.aiContentService.getStats()
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'AI_CONTENT_STATS_FETCHED',
      data,
    })
  }

  @Post('trigger-next')
  @ApiOperation({ summary: 'Kích hoạt chạy gen ngay 1 bài tiếp theo đang chờ trong hàng đợi (bỏ qua thời gian chờ)' })
  async triggerNext(): Promise<ResponseDto> {
    const item = await this.aiContentService.processNextQueuedItemIfReady(true)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: item ? 'AI_CONTENT_TRIGGER_NEXT_SUCCESS' : 'AI_CONTENT_QUEUE_EMPTY_OR_BUSY',
      data: item,
    })
  }

  /* ========================== QUẢN LÝ ĐỢT GEN (BATCHES) ========================== */

  @Post('batches')
  @ApiOperation({ summary: 'Tạo đợt yêu cầu AI gen bài viết hàng loạt cho module (story, witness-faiths, post-catalog-top)' })
  async createBatch(@Body() dto: CreateAiBatchDto): Promise<ResponseDto> {
    const data = await this.aiContentService.createBatch(dto)
    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'AI_BATCH_CREATED_SUCCESS',
      data,
    })
  }

  @Get('batches')
  @ApiOperation({ summary: 'Lấy danh sách các đợt yêu cầu gen AI hàng loạt (hỗ trợ lọc theo module, trạng thái)' })
  async getBatches(@Query() query: PaginateAiBatchDto): Promise<ResponseDto> {
    const { data, meta } = await this.aiContentService.getBatches(query)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'AI_BATCHES_FETCHED_SUCCESS',
      data,
      meta,
    })
  }

  @Get('batches/:id')
  @ApiOperation({ summary: 'Xem chi tiết 1 đợt gen AI kèm danh sách toàn bộ bài viết trong đợt' })
  @ApiParam({ name: 'id', type: Number })
  async getBatchById(@Param('id') id: number): Promise<ResponseDto> {
    const data = await this.aiContentService.getBatchById(Number(id))
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'AI_BATCH_DETAIL_FETCHED_SUCCESS',
      data,
    })
  }

  @Put('batches/:id')
  @ApiOperation({ summary: 'Cập nhật cấu hình đợt gen AI (deadline, prompt, is_image, interval_minutes)' })
  @ApiParam({ name: 'id', type: Number })
  async updateBatch(@Param('id') id: number, @Body() dto: UpdateAiBatchDto): Promise<ResponseDto> {
    const data = await this.aiContentService.updateBatch(Number(id), dto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'AI_BATCH_UPDATED_SUCCESS',
      data,
    })
  }

  @Put('batches/:id/cancel')
  @ApiOperation({ summary: 'Hủy các bài viết đang chờ (PENDING) trong đợt gen AI' })
  @ApiParam({ name: 'id', type: Number })
  async cancelBatch(@Param('id') id: number): Promise<ResponseDto> {
    const data = await this.aiContentService.cancelBatch(Number(id))
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'AI_BATCH_CANCELLED_SUCCESS',
      data,
    })
  }

  @Put('batches/:id/retry')
  @ApiOperation({ summary: 'Thử chạy lại các bài viết bị lỗi (FAILED / CANCELLED) trong đợt gen AI' })
  @ApiParam({ name: 'id', type: Number })
  async retryBatch(@Param('id') id: number): Promise<ResponseDto> {
    const data = await this.aiContentService.retryFailedInBatch(Number(id))
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'AI_BATCH_RETRY_SUCCESS',
      data,
    })
  }

  @Delete('batches/:id')
  @ApiOperation({ summary: 'Xóa đợt gen AI (tùy chọn xóa luôn bài viết đã tạo trong module qua delete_module_records)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'delete_module_records', required: false, type: Boolean })
  async deleteBatch(@Param('id') id: number, @Query('delete_module_records') deleteModuleRecords?: string): Promise<ResponseDto> {
    await this.aiContentService.deleteBatch(Number(id), deleteModuleRecords === 'true' || deleteModuleRecords === '1')
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'AI_BATCH_DELETED_SUCCESS',
    })
  }

  /* ========================== QUẢN LÝ BÀI VIẾT AI (ARTICLES) ========================== */

  @Get('articles')
  @ApiOperation({ summary: 'Lấy danh sách tất cả bài viết AI đã tạo hoặc đang chờ trên cả 3 module' })
  async getArticles(@Query() query: PaginateAiArticleDto): Promise<ResponseDto> {
    const { data, meta } = await this.aiContentService.getArticles(query)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'AI_ARTICLES_FETCHED_SUCCESS',
      data,
      meta,
    })
  }

  @Get('articles/:id')
  @ApiOperation({ summary: 'Xem chi tiết 1 bài viết AI kèm bản ghi thực tế trong module đích' })
  @ApiParam({ name: 'id', type: Number })
  async getArticleById(@Param('id') id: number): Promise<ResponseDto> {
    const data = await this.aiContentService.getArticleById(Number(id))
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'AI_ARTICLE_DETAIL_FETCHED_SUCCESS',
      data,
    })
  }

  @Put('articles/:id')
  @ApiOperation({ summary: 'Chỉnh sửa bài viết AI và tự động đồng bộ sang bảng của module tương ứng' })
  @ApiParam({ name: 'id', type: Number })
  async updateArticle(@Param('id') id: number, @Body() dto: UpdateAiArticleDto): Promise<ResponseDto> {
    const data = await this.aiContentService.updateArticle(Number(id), dto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'AI_ARTICLE_UPDATED_SUCCESS',
      data,
    })
  }

  @Post('articles/:id/regenerate')
  @ApiOperation({ summary: 'Yêu cầu AI gen ngay lập tức (hoặc gen lại mới) cho bài viết này và cập nhật vào module' })
  @ApiParam({ name: 'id', type: Number })
  async regenerateArticle(@Param('id') id: number): Promise<ResponseDto> {
    const data = await this.aiContentService.regenerateArticleNow(Number(id))
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'AI_ARTICLE_REGENERATED_SUCCESS',
      data,
    })
  }

  @Post('articles/:id/regenerate-image')
  @ApiOperation({ summary: 'Yêu cầu AI gen lại riêng hình ảnh cho bài viết này, upload lên server và gắn vào module' })
  @ApiParam({ name: 'id', type: Number })
  async regenerateArticleImage(@Param('id') id: number): Promise<ResponseDto> {
    const data = await this.aiContentService.regenerateArticleImage(Number(id))
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'AI_ARTICLE_IMAGE_REGENERATED_SUCCESS',
      data,
    })
  }

  @Delete('articles/:id')
  @ApiOperation({ summary: 'Xóa bài viết AI và đồng bộ xóa bản ghi tương ứng trong module' })
  @ApiParam({ name: 'id', type: Number })
  async deleteArticle(@Param('id') id: number): Promise<ResponseDto> {
    await this.aiContentService.deleteArticle(Number(id))
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'AI_ARTICLE_DELETED_SUCCESS',
    })
  }
}

