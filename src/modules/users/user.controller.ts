import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
  UnauthorizedException,
  Put,
  Param,
  ParseIntPipe,
} from '@nestjs/common'
import { Roles } from '@decorators/roles.decorator'
import { RolesGuard } from '@guards/roles.guard'
import { Role } from '@enums/role.enum'
import { UserService } from './user.service'
import { JwtAuthGuard } from '@guards/jwt-auth.guard'
import { CreateUserDto } from './dtos/create-user.dto'
import { UserStatus } from '@enums/status.enum'
import { Auth } from '@decorators/auth.decorator'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger'
import { ResponseDto } from '@common/response.dto'

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiBearerAuth()
  @Post('register')
  @Auth(Role.ADMIN)
  async register(@Body() createUserDto: CreateUserDto): Promise<ResponseDto> {
    const user = await this.userService.create(createUserDto)
    return new ResponseDto({
      messageCode: 'USER_CREATED',
      statusCode: 200,
      data: user,
    })
  }

  @ApiOperation({ summary: 'Get user profile' })
  @ApiBearerAuth()
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req): Promise<ResponseDto> {
    return new ResponseDto({
      messageCode: 'USER_PROFILE_RETRIEVED',
      statusCode: 200,
      data: req.user,
    })
  }

  @ApiOperation({ summary: 'Update user status (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBearerAuth()
  @Put(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: UserStatus,
  ): Promise<ResponseDto> {
    const user = await this.userService.updateStatus(id, status)
    return new ResponseDto({
      messageCode: 'USER_STATUS_UPDATED',
      statusCode: 200,
      data: user,
    })
  }

  @ApiOperation({ summary: 'Get admin data (Admin only)' })
  @ApiResponse({ status: 200, description: 'Data retrieved successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiBearerAuth()
  @Get('admin-only')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async getAdminData(): Promise<ResponseDto> {
    return new ResponseDto({
      messageCode: 'ADMIN_DATA_RETRIEVED',
      statusCode: 200,
      data: 'This route is only accessible to admins',
    })
  }

  @ApiOperation({ summary: 'Get moderator data (Moderator/Admin only)' })
  @ApiResponse({ status: 200, description: 'Data retrieved successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiBearerAuth()
  @Get('moderator-only')
  @UseGuards(RolesGuard)
  @Roles(Role.MODERATOR, Role.ADMIN)
  async getModeratorData(): Promise<ResponseDto> {
    return new ResponseDto({
      messageCode: 'MODERATOR_DATA_RETRIEVED',
      statusCode: 200,
      data: 'This route is accessible to moderators and admins',
    })
  }

  @ApiOperation({ summary: 'Get public data' })
  @ApiResponse({ status: 200, description: 'Data retrieved successfully.' })
  @Get('public')
  async getPublicData(): Promise<ResponseDto> {
    return new ResponseDto({
      messageCode: 'PUBLIC_DATA_RETRIEVED',
      statusCode: 200,
      data: 'This route is accessible to everyone',
    })
  }
}
