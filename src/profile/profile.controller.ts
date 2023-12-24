import { AzureStorageFileInterceptor } from '@nestjs/azure-storage';
import { UploadedFileMetadata } from '@nestjs/azure-storage/dist/azure-storage.service';
import {
    Body,
    Controller,
    Get,
    Put,
    UploadedFile,
    UseGuards,
} from '@nestjs/common';
import { Patch, UseInterceptors } from '@nestjs/common/decorators';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { user } from '@prisma/client';
import { GetUser } from 'src/auth/decorator';
import { JwtGuard } from 'src/auth/guard/jwt.guard';
import { ProfileDto, changePasswordDto } from './dto';
import { ProfileService } from './profile.service';

@UseGuards(JwtGuard)
@ApiBearerAuth()
@ApiTags('Profile')
@Controller('profile')
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @Put('updateProfile')
  async updateAddress(@GetUser() user: user, @Body() dto: ProfileDto) {
    return await this.profileService.updateProfile(user, dto);
  }

  @Get('getProfile')
  getProfile(@GetUser() user: user) {
    return this.profileService.getProfile(user);
  }

  @Patch('updateAva')
  @UseInterceptors(
    AzureStorageFileInterceptor('file', null, {
      containerName: 'img',
    }),
  )
  async updateAva(
    @GetUser() user: user,
    @UploadedFile() file: UploadedFileMetadata,
  ) {
    try {
      return await this.profileService.updateAva(user, file.storageUrl);
    } catch (error) {
      throw error;
    }
  }
  @Put('changePassword')
  async changePassword(@GetUser() user: user, @Body() dto: changePasswordDto) {
    return await this.profileService.changePassword(user, dto);
  }
}