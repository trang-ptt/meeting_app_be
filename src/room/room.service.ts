import { MailerService } from '@nestjs-modules/mailer';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { room, user } from '@prisma/client';
import { RtcRole, RtcTokenBuilder } from 'agora-access-token';
import { APP_CERTIFICATE, APP_ID, redisClient } from 'src/app.consts';
import { PrismaService } from 'src/prisma';
import { SocketGateway } from 'src/socket';
import { GetRoomTokenQueryDTO } from './dto';
import { RoomRepository } from './room.repository';
@Injectable()
export class RoomService {
  constructor(
    private gateway: SocketGateway,
    private roomRepo: RoomRepository,
    private mailerService: MailerService,
    private config: ConfigService,
    private prisma: PrismaService
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
    const room = await this.roomRepo.findExistingRoom(code);
    if (!room) throw new ForbiddenException('Room not exist');
    const redis = redisClient;
    await redis.connect();
    const uidList = ((await redis.json.get(code)) as number[]) || [];
    const result = [];
    for (const uid of uidList) {
      const joinedUser = await redis.json.get(`${code}:${uid}`);
      result.push(joinedUser);
    }
    await redis.disconnect();
    return result;
  }

  async getRoomChat(code: string) {
    const room = await this.roomRepo.findExistingRoom(code);
    if (!room) throw new ForbiddenException('Room not exist');
    const redis = redisClient;
    await redis.connect();
    const messages = ((await redis.json.get(`${code}:chat`)) as any[]) || [];
    await redis.disconnect();
    return messages;
  }

  async endMeet(user: user, code: string) {
    const room = await this.roomRepo.findExistingRoom(code);
    if (!room) throw new ForbiddenException('Room not exist');

    if (room.hostId !== user.userId)
      throw new ForbiddenException(
        'This user not have permission to end this meeting',
      );

    const redis = redisClient;
    await redis.connect();
    const uidList = ((await redis.json.get(code)) as number[]) || [];
    for (const uid of uidList) {
      await Promise.all([redis.json.del(`${code}:${uid}`)]);
    }
    await Promise.all([
      redis.json.del(`${code}:chat`),
      redis.json.del(code),
      await this.roomRepo.endRoomMeeting(room.id),
    ]);
    await redis.disconnect();

    this.gateway.server.to(code).emit('endMeet', code);
    return {
      code: 'SUCCESS',
    };
  }
  async sendEmailForAllParticipants(code: string, users: user[]) {
    const room = this.roomRepo.findExistingRoom(code);
    const host = this.prisma.user.findFirst({
      where:{
        userId: (await room).hostId
      }
    })
    if((await room).startTime < new Date())
      return 'Meeting time has started. Cant send email!';
    for (const user of users) {
      await this.mailerService.sendMail({
        to:user.email,
        from: this.config.get('MAIL_FROM'),
        subject: `Meet invite from ${(await host).name}`,
        text: `${(await host).name} has invited you to join meeting ${(await room).title}
        \n Time: ${((await room).startTime)}
        \n Code: ${(await room).code} \n `,
      });
    }
    return room;
  }

}
