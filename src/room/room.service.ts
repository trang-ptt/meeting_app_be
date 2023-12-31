import { MailerService } from '@nestjs-modules/mailer';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { room, user } from '@prisma/client';
import { RtcRole, RtcTokenBuilder } from 'agora-access-token';
import {
  APP_CERTIFICATE,
  APP_ID,
  RoomStatus,
  redisClient,
} from 'src/app.consts';
import { PrismaService } from 'src/prisma';
import { SocketGateway } from 'src/socket';
import { JoinUserDTO } from 'src/socket/dto';
import {
  CreateRoomDTO,
  GetListByMonthDTO,
  GetRoomTokenQueryDTO,
  JoinRequestDTO,
} from './dto';
import { RequestStatus } from './room.consts';
import { RoomRepository } from './room.repository';
@Injectable()
export class RoomService {
  constructor(
    private gateway: SocketGateway,
    private roomRepo: RoomRepository,
    private mailerService: MailerService,
    private config: ConfigService,
    private prisma: PrismaService,
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
          listUserIds: [],
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
      hostId: room.hostId,
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
      const joinedUser: any = await redis.json.get(`${code}:${uid}`);
      if (!joinedUser.request) result.push(joinedUser);
    }
    await redis.disconnect();
    return result;
  }

  async getRequestUsers(code: string) {
    const room = await this.roomRepo.findExistingRoom(code);
    if (!room) throw new ForbiddenException('Room not exist');

    const redis = redisClient;
    await redis.connect();
    const uidList = ((await redis.json.get(code)) as number[]) || [];
    const result = [];
    for (const uid of uidList) {
      const joinedUser: any = await redis.json.get(`${code}:${uid}`);
      if (joinedUser.request) result.push(joinedUser);
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
  async sendEmailForAllParticipants(code: string, emailList: string[]) {
    const room = this.roomRepo.findExistingRoom(code);
    const host = this.prisma.user.findFirst({
      where: {
        userId: (await room).hostId,
      },
    });
    if ((await room).startTime < new Date())
      return 'Meeting time has started. Cant send email!';
    for (const email of emailList) {
      await this.mailerService.sendMail({
        to: email,
        from: this.config.get('MAIL_FROM'),
        subject: `Meet invite from ${(await host).name}`,
        text: `${(await host).name} has invited you to join meeting ${
          (await room).title
        }
        \n Time: ${(await room).startTime}
        \n Code: ${(await room).code} \n `,
      });
    }
    return room;
  }

  async create(user: user, dto: CreateRoomDTO) {
    const { title, listUserIds } = dto;
    const uid = user.userId;
    const startTime = dto.startTime || Date.now();
    const endTime = dto.endTime || startTime + 3600000;
    listUserIds.push(user.id);

    let code, room;
    while (!code) {
      code = this.randomString(6);
      room = await this.roomRepo.findExistingRoom(code);
      if (room) code = undefined;
      else {
        room = await this.roomRepo.createRoom({
          code,
          title,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          hostId: uid,
          listUserIds,
        });
      }
    }

    const emails = [];
    for (const id of listUserIds) {
      const joinUser = await this.prisma.user.findUnique({
        where: {
          id,
        },
      });
      if (!joinUser) {
        console.error(`User id ${id} not exists`);
      } else {
        emails.push(joinUser.email);
      }
    }

    if (emails.length > 0)
      await this.sendEmailForAllParticipants(code, emails).catch((error) => {
        console.error(error);
      });

    return room;
  }

  async getRoomList(user: user) {
    const rooms = [];
    //get ongoing
    const ongoingRooms = await this.getOngoingRoom(user);
    if (ongoingRooms.length > 0) {
      ongoingRooms.forEach((room) => {
        rooms.push(room);
      });
    }
    //get scheduled
    const scheduledRooms = await this.getScheduledRooms(user);
    if (scheduledRooms.length > 0) {
      scheduledRooms.forEach((room) => {
        rooms.push(room);
      });
    }

    return rooms;
  }

  async getOngoingRoom(user: user) {
    const rooms = [];
    const lastJoinedRoom: any = await this.prisma.room.findFirst({
      where: {
        id: user.lastJoinedRoomId,
        endTime: {
          gt: new Date(),
        },
      },
    });
    if (lastJoinedRoom) {
      lastJoinedRoom.status = RoomStatus.ONGOING;
      rooms.push(lastJoinedRoom);
    }

    const hostRoom: any = await this.prisma.room.findFirst({
      where: {
        hostId: user.userId,
        endTime: {
          gt: new Date(),
        },
        startTime: {
          lte: new Date(),
        },
      },
    });
    if (hostRoom) {
      hostRoom.status = RoomStatus.ONGOING;
      rooms.push(hostRoom);
    }
    return rooms;
  }

  async getScheduledRooms(user: user) {
    const rooms: any[] = await this.prisma.room.findMany({
      where: {
        hostId: user.userId,
        startTime: {
          gte: new Date(),
        },
      },
    });

    for (const room of rooms) {
      room.status = RoomStatus.SCHEDULED;
    }
    return rooms;
  }

  async requestToJoin(user: user, dto: JoinUserDTO) {
    const { code, micStatus, camStatus } = dto;
    const uid = user.userId;
    const username = user.name || user.email.split('@')[0];
    const room = await this.roomRepo.findExistingRoom(code);
    if (!room) throw new ForbiddenException('Room not exist');

    const invited = room.listParticipant?.find((e) => e === user.id) || null;

    if (room.hostId === user.userId || invited) {
      return {
        code: 'SUCCESS',
        status: RequestStatus.APPROVE,
        message: 'User can join',
      };
    }

    const redis = redisClient;
    await redis.connect();
    const list: number[] = ((await redis.json.get(code, {})) as number[]) || [];

    const found = list?.find((e) => e === uid) || null;
    if (!found) {
      list.push(uid);
      await Promise.all([
        redis.json.set(code, '$', list),
        redis.json.set(`${code}:${uid}`, '$', {
          uid,
          username,
          avatar: user.avatar,
          micStatus: micStatus || false,
          camStatus: camStatus || false,
          request: true,
        }),
      ]);
    }
    await redis.disconnect();
    this.gateway.server.to(code).emit('onRequest', {
      user,
      status: RequestStatus.WAITING,
    });

    return {
      code: 'SUCCESS',
      status: RequestStatus.WAITING,
      message: 'Waiting to join',
    };
  }

  async replyJoinRequest(user: user, dto: JoinRequestDTO) {
    const { code, uid, accept } = dto;
    let status;

    const [room, reqUser] = await Promise.all([
      this.roomRepo.findExistingRoom(code),
      this.prisma.user.findUnique({
        where: {
          userId: uid,
        },
      }),
    ]);
    if (!room) throw new ForbiddenException('Room not exist');
    if (user.userId !== room.hostId)
      throw new ForbiddenException('Only host can reply');

    const redis = redisClient;
    await redis.connect();

    const joinedUser: any = await redis.json.get(`${code}:${uid}`);

    if (accept) {
      await redis.json.set(`${code}:${uid}`, '$', {
        uid,
        username: joinedUser.username,
        avatar: user.avatar,
        micStatus: joinedUser.micStatus || false,
        camStatus: joinedUser.camStatus || false,
      });
      status = RequestStatus.APPROVE;
    } else {
      status = RequestStatus.DECLINE;

      const list: number[] =
        ((await redis.json.get(code, {})) as number[]) || [];

      //remove from list
      const index = list.indexOf(uid);
      if (index > -1) {
        list.splice(index, 1);
      }

      await redis.json.set(code, '$', list);

      await redis.json.del(`${code}:${uid}`);
    }
    await redis.disconnect();

    this.gateway.server.to(code).emit('onRequest', {
      user: reqUser,
      status,
    });

    return {
      code: 'SUCCESS',
    };
  }

  async getListByMonth(user: user, dto: GetListByMonthDTO) {
    const { firstDay, lastDay } = this.getFirstAndLastTimeOfMonth(
      dto.timestamp,
    );

    const rooms: any[] = await this.prisma.room.findMany({
      where: {
        AND: {
          OR: [
            {
              hostId: user.userId,
            },
            {
              listParticipant: {
                has: user.id,
              },
            },
          ],
          startTime: {
            gte: firstDay,
          },
          endTime: {
            lte: lastDay,
          },
        },
      },
    });

    await Promise.all(
      rooms.map(async (room) => {
        if (!room.title) {
          room.title = 'No title';
        }
        const participants = await Promise.all(
          room.listParticipant.map(async (id: string) => {
            const u = await this.prisma.user.findUnique({
              where: {
                id,
              },
            });
            delete u.password;
            delete u.lastJoinedRoomId;
            return u;
          }),
        );
        const found = room.listParticipant?.find((e) => e === user.id) || null;
        if (!found) participants.push(user);
        room.listParticipant = participants;
      }),
    );

    return rooms;
  }

  getFirstAndLastTimeOfMonth(timestamp: number) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDay = new Date(year, month, 1).getTime();

    const lastDay = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
    return {
      firstDay: new Date(firstDay),
      lastDay: new Date(lastDay),
    };
  }
}
