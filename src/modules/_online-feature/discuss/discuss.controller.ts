import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Query, Req } from '@nestjs/common'
import { DiscussService } from './discuss.service'
import { ResponseDto } from '@common/response.dto'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CreateDiscussDto } from './dtos/create-discuss.dto'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { PaginateChildDiscussDto, PaginateDiscussDto } from './dtos/paginate-discuss.dto'

@Controller('admin/discuss')
@ApiTags('Admin Discuss')
@ApiBearerAuth()
@Auth(Role.ADMIN, Role.STAFF, Role.TEACHER)
export class AdminDiscussController {
  constructor(private readonly discussService: DiscussService) {}
  @Post()
  @ApiOperation({ summary: 'Create a discuss' })
  async createDiscuss(@Body() createDiscussDto: CreateDiscussDto, @Req() req): Promise<ResponseDto> {
    const discuss = await this.discussService.createDiscuss(createDiscussDto, req.user.userId)
    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'DISCUSS_CREATED_SUCCESSFULLY',
      data: discuss,
    })
  }

  @Get('parent')
  @ApiOperation({ summary: 'Get parent discusses' })
  async getPaginateDiscusses(@Query() paginateDiscussDto: PaginateDiscussDto, @Req() req): Promise<ResponseDto> {
    const discusses = await this.discussService.getParentDiscuss(req.user.userId, paginateDiscussDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'DISCUSS_FETCHED_SUCCESSFULLY',
      data: discusses,
    })
  }

  @Get('child')
  @ApiOperation({ summary: 'Get child discusses by parent id' })
  async getDiscussById(@Query() paginateDiscussDto: PaginateChildDiscussDto, @Req() req): Promise<ResponseDto> {
    const discuss = await this.discussService.getListChildDiscuss(req.user.userId, paginateDiscussDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'DISCUSS_FETCHED_SUCCESSFULLY',
      data: discuss,
    })
  }

  // @Put(':id')
  // @ApiOperation({ summary: 'Update a discuss' })
  // async updateDiscuss(@Param('id') id: number, @Body() updateDiscussDto: UpdateDiscussDto, @Req() req): Promise<ResponseDto> {
  //   await this.discussService.updateDiscuss(id, updateDiscussDto, req.user.userId)
  //   return new ResponseDto({
  //     statusCode: HttpStatus.OK,
  //     messageCode: 'DISCUSS_UPDATED_SUCCESSFULLY',
  //   })
  // }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a discuss' })
  async deleteDiscuss(@Param('id') id: number, @Req() req): Promise<ResponseDto> {
    await this.discussService.deleteDiscuss(id, req.user.userId)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'DISCUSS_DELETED_SUCCESSFULLY',
    })
  }
}
@Controller('discuss')
@ApiTags('User Discuss')
@ApiBearerAuth()
@Auth()
export class UserDiscussController {
  constructor(private readonly discussService: DiscussService) {}

  @Post()
  @ApiOperation({ summary: 'Create a discuss' })
  async createDiscuss(@Body() createDiscussDto: CreateDiscussDto, @Req() req): Promise<ResponseDto> {
    const discuss = await this.discussService.createDiscuss(createDiscussDto, req.user.userId)
    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'DISCUSS_CREATED_SUCCESSFULLY',
      data: discuss,
    })
  }

  @Get('parent')
  @ApiOperation({ summary: 'Get parent discusses' })
  async getPaginateDiscusses(@Query() paginateDiscussDto: PaginateDiscussDto, @Req() req): Promise<ResponseDto> {
    const discusses = await this.discussService.getParentDiscuss(req.user.userId, paginateDiscussDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'DISCUSS_FETCHED_SUCCESSFULLY',
      data: discusses,
    })
  }

  @Get('child')
  @ApiOperation({ summary: 'Get child discusses by parent id' })
  async getDiscussById(@Query() paginateDiscussDto: PaginateChildDiscussDto, @Req() req): Promise<ResponseDto> {
    const discuss = await this.discussService.getListChildDiscuss(req.user.userId, paginateDiscussDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'DISCUSS_FETCHED_SUCCESSFULLY',
      data: discuss,
    })
  }

  // @Put(':id')
  // @ApiOperation({ summary: 'Update a discuss' })
  // async updateDiscuss(@Param('id') id: number, @Body() updateDiscussDto: UpdateDiscussDto, @Req() req): Promise<ResponseDto> {
  //   await this.discussService.updateDiscuss(id, updateDiscussDto, req.user.userId)
  //   return new ResponseDto({
  //     statusCode: HttpStatus.OK,
  //     messageCode: 'DISCUSS_UPDATED_SUCCESSFULLY',
  //   })
  // }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a discuss' })
  async deleteDiscuss(@Param('id') id: number, @Req() req): Promise<ResponseDto> {
    await this.discussService.deleteDiscuss(id, req.user.userId)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'DISCUSS_DELETED_SUCCESSFULLY',
    })
  }
}
