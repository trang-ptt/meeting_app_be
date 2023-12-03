import { ForbiddenException, Injectable } from '@nestjs/common';
import { room, user } from '@prisma/client';
import { RtcRole, RtcTokenBuilder } from 'agora-access-token';
import { APP_CERTIFICATE, APP_ID, redisClient } from 'src/app.consts';
import { SocketGateway } from 'src/socket';
import { GetRoomTokenQueryDTO } from './dto';
import { RoomRepository } from './room.repository';

@Injectable()
export class RoomService {
  constructor(
    private gateway: SocketGateway,
    private roomRepo: RoomRepository,
  ) {}

  randomString(length: number) {
    let result = '';
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
  }

  async getRoomToken(dto: GetRoomTokenQueryDTO, user: user) {
    const uid = user.userId;
    const expireTime = dto.expireTime || '3600';
    let { code } = dto;
    const { title } = dto;
    let room: room,
      role: number = RtcRole.SUBSCRIBER,
      startTime: number = parseInt(dto.startTime) || Date.now();

    if (code) {
      room = await this.roomRepo.findExistingRoom(code);
      if (!room) throw new ForbiddenException('Room not exist');
      startTime = room.startTime.getTime();
    }

    // get the expire time
    const privilegeExpireTime = Math.floor(
      startTime / 1000 + parseInt(expireTime, 10),
    );

    while (!code) {
      code = this.randomString(6);
      room = await this.roomRepo.findExistingRoom(code);
      if (room) code = undefined;
      else {
        room = await this.roomRepo.createRoom({
          code,
          title,
          startTime: new Date(startTime),
          endTime: new Date(privilegeExpireTime * 1000),
          hostId: uid,
        });
      }
    }

    if (room.hostId === uid) {
      role = RtcRole.PUBLISHER;
    }

    // build the token
    const token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      code,
      uid,
      role,
      privilegeExpireTime,
    );

    // return the token
    return {
      rtcToken: token,
      code,
    };
  }

  async getRoomParticipant(code: string) {
    return await redisClient.ft.search(code, '*', {});
  }
}
