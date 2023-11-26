import { OnModuleInit } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { redisClient } from 'src/app.consts';
import { v4 as uuidv4 } from 'uuid';
@WebSocketGateway()
export class SocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer()
  server: Server;

  onModuleInit(): void {
    this.server.on('connection', (socket) => {
      console.log(socket.id);
      socket.data.color = `#${((Math.random() * 0xffffff) << 0)
        .toString(16)
        .padStart(6, '0')}`;

      this.joinRoom(socket);
    });
  }

  handleDisconnect(socket: Socket) {
    socket.disconnect();
  }

  handleConnection(socket: Socket) {
    socket.data.user = socket.handshake.query.name;
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
    socket.on(
      'join-room',
      async (
        roomId: string,
        user: {
          username;
          joinId?;
        },
      ) => {
        try {
          const username = user.username;
          socket.join(roomId);
          const joinId = uuidv4();
          socket.to(roomId).emit('user-connected', {
            username,
            joinId,
          });
          const redis = redisClient;
          await redis.connect();

          const joinedUser = await redis.json.get(`${roomId}:${joinId}`);
          if (!joinedUser) {
            await redis.json.set(`${roomId}:${joinId}`, '$', {
              joinId,
              username,
              ava: '#FFFFFF',
            });
          }

          await redis.disconnect();
        } catch (error) {
          // throw error;
          console.error(error);
        }
      },
    );
  }
}
