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

  async findAllExistingRoom() {
    return await this.prisma.room.findMany({
      where: {
        endTime: {
          gte: new Date(),
        },
      },
    });
  }
}
