import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { ResponseDto } from 'src/common/response.dto'
import { CreateFooterDto } from './dtos/craete-footer.dto'
import { UpdateFooterDto } from './dtos/update-footer.dto'
import { FooterService } from './footer.service'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { FooterEnum } from '@enums/footer.enum'
/*================================================
=======================ADMIN========================
================================================*/
@ApiTags('Admin Footer')
@ApiBearerAuth()
@Auth(Role.ADMIN)
@Controller('admin/footer')
export class FooterAdminController {
  constructor(private readonly footerService: FooterService) {}

  @Post()
  @ApiOperation({ summary: 'Create footer' })
  async createFooter(@Body() createFooterDto: CreateFooterDto): Promise<ResponseDto> {
    const footer = await this.footerService.createFooter(createFooterDto)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'CREATE_FOOTER_SUCCESS',
      data: footer,
    })
  }

  @Get()
  @ApiOperation({ summary: 'Get all footer' })
  async getFooter(): Promise<ResponseDto> {
    const footer = await this.footerService.getFooter()
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_FOOTER_SUCCESS',
      data: footer,
    })
  }

  @Get(':type')
  @ApiOperation({ summary: 'Get footer by type' })
  @ApiParam({ name: 'type', enum: FooterEnum })
  async getFooterByType(@Param('type') type: FooterEnum): Promise<ResponseDto> {
    const footer = await this.footerService.getFooterByType(type)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_FOOTER_BY_TYPE_SUCCESS',
      data: footer,
    })
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update footer' })
  async updateFooter(@Param('id') id: string, @Body() updateFooterDto: UpdateFooterDto): Promise<ResponseDto> {
    const footer = await this.footerService.updateFooter(Number(id), updateFooterDto)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'UPDATE_FOOTER_SUCCESS',
      data: footer,
    })
  }
}

/*================================================
=======================USER========================
================================================*/
@ApiTags('Footer')
@Controller('footer')
export class FooterUserController {
  constructor(private readonly footerService: FooterService) {}

  @Get()
  @ApiOperation({ summary: 'Get all footer' })
  async getFooter(): Promise<ResponseDto> {
    const footer = await this.footerService.getFooter()
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_FOOTER_SUCCESS',
      data: footer,
    })
  }

  @Get(':type')
  @ApiOperation({ summary: 'Get footer by type' })
  @ApiParam({ name: 'type', enum: FooterEnum })
  async getFooterByType(@Param('type') type: FooterEnum): Promise<ResponseDto> {
    const footer = await this.footerService.getFooterByType(type)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_FOOTER_BY_TYPE_SUCCESS',
      data: footer,
    })
  }
}
