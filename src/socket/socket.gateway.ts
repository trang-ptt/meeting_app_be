import { OnModuleInit } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

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

  joinRoom(socket: Socket) {
    socket.on('join-room', (roomId, user) => {
      socket.join(roomId);
      socket.to(roomId).emit('user-connected', user);
      console.log(user);
    });
  }
}
