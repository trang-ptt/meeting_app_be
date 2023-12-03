import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma';

@Injectable()
export class SocketRepository {
  constructor(private prisma: PrismaService) {}

  async findExistingRoom(code: string) {
    return await this.prisma.room.findFirst({
      where: {
        code,
        endTime: {
          gte: new Date(),
        },
      },
    });
  }

  async findUser(uid: number) {
    return await this.prisma.user.findUnique({
      where: {
        userId: uid,
      },
    });
  }
}
