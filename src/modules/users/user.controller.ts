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

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiBearerAuth()
  @Post('register')
  @Auth(Role.ADMIN)
  async register(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto)
  }

  @ApiOperation({ summary: 'Get user profile' })
  @ApiBearerAuth()
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@Request() req) {
    return req.user
  }

  @ApiOperation({ summary: 'Update user status (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBearerAuth()
  @Put(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async updateStatus(@Param('id', ParseIntPipe) id: number, @Body('status') status: UserStatus) {
    return this.userService.updateStatus(id, status)
  }

  @ApiOperation({ summary: 'Get admin data (Admin only)' })
  @ApiResponse({ status: 200, description: 'Data retrieved successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiBearerAuth()
  @Get('admin-only')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  getAdminData() {
    return 'This route is only accessible to admins'
  }

  @ApiOperation({ summary: 'Get moderator data (Moderator/Admin only)' })
  @ApiResponse({ status: 200, description: 'Data retrieved successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiBearerAuth()
  @Get('moderator-only')
  @UseGuards(RolesGuard)
  @Roles(Role.MODERATOR, Role.ADMIN)
  getModeratorData() {
    return 'This route is accessible to moderators and admins'
  }

  @ApiOperation({ summary: 'Get public data' })
  @ApiResponse({ status: 200, description: 'Data retrieved successfully.' })
  @Get('public')
  getPublicData() {
    return 'This route is accessible to everyone'
  }
}
