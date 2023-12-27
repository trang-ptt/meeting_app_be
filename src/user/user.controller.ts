import { Body, Controller, Get, Patch, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { user } from '@prisma/client';
import { CloudinaryService } from 'nestjs-cloudinary';
import { GetUser } from 'src/auth/decorator';
import { JwtGuard } from 'src/auth/guard';
import { ProfileDto, changePasswordDto } from './dto';
import { UserService } from './user.service';

@ApiTags('User')
@UseGuards(JwtGuard)
@ApiBearerAuth()
@Controller('user')
export class UserController {
  constructor(private config: ConfigService,
    private userService: UserService,
    private cloudinaryService: CloudinaryService,) {}

  @Get('me')
  getMe(@GetUser() user: user) {
    return user;
  }
  @Get('search')
  async findUsersByNameAndEmail(@Query('name') name: string){
    try {
        const users = await this.userService.findUsersByNameAndEmail(name);
        if (users.length > 0) {
            return users;
        } else {
            return 'No users found';
        }
    } catch (error) {
        return 'Error while fetching users';
    }
  }
  @Get('searchByUid')
  async findUsersById(@Query('uid') uid: string){
    try {
      const userId = parseInt(uid, 10);
      return await this.userService.findUserById(userId);
    } catch (error) {
        return 'Error while fetching users';
    }
  }
  @Get('all')
  async getAllUser(){
    return this.userService.getAllUser();
  }
  @Get('getProfile')
  async getProfile(@GetUser() user: user) {
    return this.userService.getProfile(user);
  }
  @Patch('changePassword')
  async changePassword(@GetUser() user: user, @Body() dto: changePasswordDto) {
    return await this.userService.changePassword(user, dto);
  }
  @Patch('updateProfile')
  @UseInterceptors(FileInterceptor('file'))
  async updateProfileWithAva(
    @GetUser() user: user,
    @Body() dto: ProfileDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (file) await this.uploadFile(user, file);
    return await this.userService.updateProfile(user, dto);
  }

  async uploadFile(
    @GetUser() user: user,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      const uploaded = await this.cloudinaryService.uploadFile(file, {
        resource_type: 'auto'
      });
      console.log(uploaded.url);
      return await this.userService.uploadAva(user, uploaded.url);
    } catch (error) {
      throw error;
    }
  }
}
