import { ForbiddenException, Injectable } from '@nestjs/common';
import { user } from '@prisma/client';
import * as argon from 'argon2';
import { PrismaService } from './../prisma/prisma.service';
import { ProfileDto, changePasswordDto } from './dto';
@Injectable()
export class ProfileService {
  constructor(private prismaService: PrismaService) {}
  async getProfile(user: user) {
    const getProfile = await this.prismaService.user.findMany({
      where: {
        id: user.id,
      },
      select: {
        email: true,
        name: true,
        avatar: true,
      },
    });
    return getProfile;
  }

  async updateProfile(user: user, dto: ProfileDto) {
    const update = await this.prismaService.user.update({
      where: {
        id: user.id,
      },
      data: {
        name: dto.name,
        avatar: dto.avatar,
      },
    });
    return update;
  }

  async updateAva(user: user, file: string) {
    const up = await this.prismaService.user.update({
      where: {
        id: user.id,
      },
      data: {
        avatar: file,
      },
    });
    return up.avatar;
  }

  async changePassword(user: user, dto: changePasswordDto) {
    const userr = await this.prismaService.user.findUnique({
      where: {
        id: user.id,
      },
    });

    if (await argon.verify(userr.password, dto.oldPass)) {
      if (dto.newPass.length >= 6) {
        if (dto.newPass === dto.confirmPass) {
          const hash = await argon.hash(dto.newPass);
          await this.prismaService.user.update({
            where: {
              id: user.id,
            },
            data: {
              password: hash,
            },
          });
        } else {
          throw new ForbiddenException('Confirm password incorrect!');
        }
      } else {
        throw new ForbiddenException(
          'Password must be more than 6 characters!',
        );
      }
    } else {
      throw new ForbiddenException('Old password incorrect');
    }
  }
}