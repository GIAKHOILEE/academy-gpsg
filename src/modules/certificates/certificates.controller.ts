import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Query } from '@nestjs/common'
import { CertificatesService } from './certificates.service'
import { PaginateCertificatesDto } from './dtos/paginate-certificates.dto'
import { ResponseDto } from '@common/response.dto'
import { CreateCertificatesDto } from './dtos/create-certificates.dto'
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'

@ApiTags('Admin Certificates')
@Controller('admin/certificates')
export class AdminCertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a certificate' })
  async createCertificates(@Body() createCertificatesDto: CreateCertificatesDto): Promise<ResponseDto> {
    const certificate = await this.certificatesService.create(createCertificatesDto)
    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'CERTIFICATE_CREATED_SUCCESSFULLY',
      data: certificate,
    })
  }

  @Get()
  @ApiOperation({ summary: 'Get all certificates' })
  async findAll(@Query() dto: PaginateCertificatesDto): Promise<any> {
    const data = await this.certificatesService.findAll(dto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'CERTIFICATES_FETCHED_SUCCESSFULLY',
      data: data,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a certificate by id' })
  @ApiParam({ name: 'id', type: Number, description: 'Certificate id' })
  async findOne(@Param('id') id: number): Promise<ResponseDto> {
    const certificate = await this.certificatesService.findOne(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'CERTIFICATE_FETCHED_SUCCESSFULLY',
      data: certificate,
    })
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a certificate' })
  @ApiParam({ name: 'id', type: Number, description: 'Certificate id' })
  async deleteCertificates(@Param('id') id: number): Promise<ResponseDto> {
    await this.certificatesService.remove(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'CERTIFICATE_DELETED_SUCCESSFULLY',
    })
  }
}

@Controller('certificates')
export class CertificatesController {
    constructor(private readonly certificatesService: CertificatesService) {}

    @Get()
    async findAll(@Query() dto: PaginateCertificatesDto):Promise<any> {
        const data = await this.certificatesService.findAll(dto);
        return new ResponseDto({
              statusCode: HttpStatus.OK,
              messageCode: 'CERTIFICATES_FETCHED_SUCCESSFULLY',
              data: data,
            })
    }

    @Get(':id')
    async findOne(@Param('id') id: number): Promise<ResponseDto> {
        const certificate = await this.certificatesService.findOne(id)
        return new ResponseDto({
            statusCode: HttpStatus.OK,
            messageCode: 'CERTIFICATE_FETCHED_SUCCESSFULLY',
            data: certificate,
        })
    }
}