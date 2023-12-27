import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma';
import { RoomDTO } from './dto';

@Injectable()
export class RoomRepository {
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

  async createRoom(dto: RoomDTO) {
    return await this.prisma.room.create({
      data: {
        code: dto.code,
        title: dto.title,
        startTime: dto.startTime,
        endTime: dto.endTime,
        hostId: dto.hostId,
        listParticipant: dto.listUserIds,
      },
    });
  }

  async endRoomMeeting(id: string) {
    return await this.prisma.room.update({
      where: {
        id,
      },
      data: {
        endTime: new Date(),
      },
    });
  }
}
