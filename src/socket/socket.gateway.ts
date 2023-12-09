import { HttpCode, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { user } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { redisClient } from 'src/app.consts';
import { AuthService } from 'src/auth/auth.service';
import { PrismaService } from 'src/prisma';
import { JoinUserDTO } from './dto';
import { SocketRepository } from './socket.repository';
@WebSocketGateway()
export class SocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer()
  server: Server;

  constructor(
    private socketRepo: SocketRepository,
    private prismaService: PrismaService,
    private authService: AuthService,
  ) {}

  onModuleInit(): void {
    this.server.on('connection', (socket) => {
      console.log(socket.id);
      socket.data.color = `#${((Math.random() * 0xffffff) << 0)
        .toString(16)
        .padStart(6, '0')}`;

      this.joinRoom(socket);
      this.leaveRoom(socket);
    });
  }

  handleDisconnect(socket: Socket) {
    socket.disconnect();
  }

  async handleConnection(socket: Socket) {
    try {
      const decodedToken = await this.authService.verifyJwt(
        socket.handshake.headers.authorization.split(' ')[1],
      );
      const user = await this.prismaService.user.findUnique({
        where: {
          userId: decodedToken.sub,
        },
      });
      delete user.password;

      if (!user) {
        return this.disconnect(socket);
      } else {
        socket.data.user = user;
      }

      socket.emit('init', {
        message: 'Welcome to the live server!',
      });
    } catch (error) {
      console.log(error);
      return this.disconnect(socket);
    }
  }

  private disconnect(socket: Socket) {
    socket.emit('Error', new UnauthorizedException());
    socket.disconnect();
  }

  @SubscribeMessage('message')
  handleMessage(socket: Socket, payload: string): void {
    this.server.emit('onMessage', {
      user: socket.data.user,
      message: payload,
      color: socket.data.color,
    });
  }

  async joinRoom(socket: Socket) {
    socket.on('joinRoom', async (dto: JoinUserDTO) => {
      try {
        if (!socket.data.user) await this.handleConnection(socket);
        const user: user = socket.data.user;
        const { code } = dto;

        const room = await this.socketRepo.findExistingRoom(code);
        if (!room) {
          console.error('Room not exist');
          return HttpCode(400);
        }

        const username = user.name || user.email.split('@')[0];
        const uid = user.userId;

        socket.join(code);

        const redis = redisClient;
        await redis.connect();
        const list: number[] =
          ((await redis.json.get(code, {})) as number[]) || [];

        const found = list?.find((e) => e === uid) || null;
        if (!found) {
          list.push(uid);
          await redis.json.set(code, '$', list);
        }

        await redis.json.set(`${code}:${uid}`, '$', {
          uid,
          username,
          avatar: user.avatar,
          micStatus: dto.micStatus || false,
          camStatus: dto.camStatus || false,
        });

        const joinedUser = await redis.json.get(`${code}:${uid}`);
        await redis.disconnect();
        socket.to(code).emit('userConnected', joinedUser);
      } catch (error) {
        console.error(error);
        throw error;
      }
    });
  }

  async leaveRoom(socket: Socket) {
    socket.on('leaveRoom', async (code: string) => {
      if (!socket.data.user) await this.handleConnection(socket);
      const user: user = socket.data.user;
      const username = user.name || user.email.split('@')[0];
      const redis = redisClient;
      await redis.connect();
      const list: number[] =
        ((await redis.json.get(code, {})) as number[]) || [];

      //remove from list
      const index = list.indexOf(user.userId);
      if (index > -1) {
        list.splice(index, 1);
      }

      await redis.json.set(code, '$', list);

      await redis.json.del(`${code}:${user.userId}`);

      await redis.disconnect();

      socket.to(code).emit('userDisconnected', {
        uid: user.userId,
        username,
      });
    });
  }
}
