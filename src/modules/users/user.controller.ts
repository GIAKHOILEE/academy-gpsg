import { ResponseDto } from '@common/response.dto'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { UserStatus } from '@enums/status.enum'
import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, Request } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { CreateUserDto } from './dtos/create-user.dto'
import { PaginateUserDto } from './dtos/paginate-user.dto'
import { UpdatePasswordDto, UpdateUserDto } from './dtos/update-user.dto'
import { UserService } from './user.service'

// ============================================
// ================== ADMIN ===================
// ============================================
@ApiTags('admin/users')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly userService: UserService) {}

  @Get('test')
  async test(): Promise<string> {
    return 'Hello World'
  }

  // tạo tài khoản cho admin
  @ApiOperation({ summary: 'Tạo tài khoản mới cho Admin' })
  @ApiBearerAuth()
  @Post('register-admin')
  @Auth(Role.ADMIN)
  async registerAdmin(@Body() createUserDto: CreateUserDto): Promise<ResponseDto> {
    const user = await this.userService.create(createUserDto, Role.ADMIN)
    return new ResponseDto({
      messageCode: 'ADMIN_CREATED_SUCCESS',
      statusCode: 200,
      data: user,
    })
  }

  // lấy danh sách admin
  @ApiOperation({ summary: 'Lấy danh sách Admin' })
  @ApiBearerAuth()
  @Get('admin')
  @Auth(Role.ADMIN)
  async getAdmin(@Query() paginateUserDto: PaginateUserDto): Promise<ResponseDto> {
    const users = await this.userService.getAllUsers(paginateUserDto, Role.ADMIN)
    return new ResponseDto({
      messageCode: 'ADMIN_RETRIEVED_SUCCESS',
      statusCode: 200,
      data: users.data,
      meta: users.meta,
    })
  }

  // tạo tài khoản mới cho học viên
  // @ApiOperation({ summary: 'Tạo tài khoản mới cho học viên' })
  // @ApiBearerAuth()
  // @Post('register-student')
  // @Auth(Role.ADMIN)
  // async register(@Body() createUserDto: CreateUserDto): Promise<ResponseDto> {
  //   const user = await this.userService.create(createUserDto, Role.STUDENT)
  //   return new ResponseDto({
  //     messageCode: 'STUDENT_CREATED',
  //     statusCode: 200,
  //     data: user,
  //   })
  // }

  // @ApiOperation({ summary: 'Tạo tài khoản mới cho giáo viên' })
  // @ApiBearerAuth()
  // @Post('register-teacher')
  // @Auth(Role.ADMIN)
  // async registerTeacher(@Body() createUserDto: CreateUserDto): Promise<ResponseDto> {
  //   const user = await this.userService.create(createUserDto, Role.TEACHER)
  //   return new ResponseDto({
  //     messageCode: 'TEACHER_CREATED',
  //     statusCode: 200,
  //     data: user,
  //   })
  // }

  // @ApiOperation({ summary: 'Lấy danh sách giáo viên' })
  // @ApiBearerAuth()
  // @Get('teachers')
  // @Auth(Role.ADMIN)
  // async getAllTeachers(@Query() paginateUserDto: PaginateUserDto): Promise<ResponseDto> {
  //   const teachers = await this.userService.getAllUsers(paginateUserDto, Role.TEACHER)
  //   return new ResponseDto({
  //     messageCode: 'TEACHERS_RETRIEVED',
  //     statusCode: 200,
  //     data: teachers.data,
  //     meta: teachers.meta,
  //   })
  // }

  // @ApiOperation({ summary: 'Lấy danh sách học sinh' })
  // @ApiBearerAuth()
  // @Get('students')
  // @Auth(Role.ADMIN)
  // async getAllStudents(@Query() paginateUserDto: PaginateUserDto): Promise<ResponseDto> {
  //   const students = await this.userService.getAllUsers(paginateUserDto, Role.STUDENT)
  //   return new ResponseDto({
  //     messageCode: 'STUDENTS_RETRIEVED',
  //     statusCode: 200,
  //     data: students.data,
  //     meta: students.meta,
  //   })
  // }

  @ApiOperation({ summary: 'Cập nhật trạng thái của Admin' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBearerAuth()
  @Put(':id/status')
  @Auth(Role.ADMIN)
  async updateStatus(@Param('id', ParseIntPipe) id: number, @Body('status') status: UserStatus): Promise<ResponseDto> {
    await this.userService.updateStatus(id, status)
    return new ResponseDto({
      messageCode: 'USER_STATUS_UPDATED_SUCCESS',
      statusCode: 200,
    })
  }

  @ApiOperation({ summary: 'Cập nhật thông tin của Admin' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBearerAuth()
  @Put(':id')
  @Auth(Role.ADMIN)
  async updateUser(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto): Promise<ResponseDto> {
    await this.userService.updateUser(id, updateUserDto)
    return new ResponseDto({
      messageCode: 'USER_UPDATED_SUCCESS',
      statusCode: 200,
    })
  }
}

// ============================================
// ================== USER ===================
// ============================================
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: 'Lấy thông tin hồ sơ của bản thân' })
  @ApiBearerAuth()
  @Get('me')
  @Auth()
  async getMe(@Request() req): Promise<ResponseDto> {
    const user = await this.userService.getMe(req.user.userId)
    return new ResponseDto({
      messageCode: 'GET_ME_SUCCESS',
      statusCode: 200,
      data: user,
    })
  }

  @ApiOperation({ summary: 'Cập nhật mật khẩu của bản thân' })
  @ApiBearerAuth()
  @Put('me/password')
  @Auth()
  async updatePassword(@Request() req, @Body() updatePasswordDto: UpdatePasswordDto): Promise<ResponseDto> {
    await this.userService.updatePassword(req.user.userId, updatePasswordDto)
    return new ResponseDto({
      messageCode: 'PASSWORD_UPDATED_SUCCESS',
      statusCode: 200,
    })
  }
}
