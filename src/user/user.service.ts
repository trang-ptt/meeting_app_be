import { ForbiddenException, Injectable } from '@nestjs/common';
import { user } from '@prisma/client';
import * as argon from 'argon2';
import { PrismaService } from 'src/prisma';
import { ProfileDto, changePasswordDto } from './dto';
@Injectable()
export class UserService {
    constructor(private prismaService: PrismaService) {}
    async findUsersByNameAndEmail(name: string) {
        return this.prismaService.user.findMany({
            where: {
                OR: [
                    { name: { contains: name } },
                    { email: { contains: name } },
                ],
            },
        });
    }
    async findUserById(uid: number){
        return this.prismaService.user.findUnique({
            where:{
                userId: uid,
            }
        })
    }
    async getAllUser(){
        return this.prismaService.user.findMany();
    }
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
          },
        });
        return update;
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
      async uploadAva(user: user, file: string) {
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
}
