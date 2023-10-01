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
export class AppGateway
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
      this.server.emit('onMessage', {
        user: 'AUTO',
        message: `User ${socket.handshake.query.name} has join the chat`,
        color: `#FFFFFF`
      })
    });
  }

  handleDisconnect(client: Socket) {
    client.disconnect();
  }

  handleConnection(client: Socket) {
    client.data.user = client.handshake.query.name;
  }

  @SubscribeMessage('message')
  handleMessage(client: Socket, payload: string): void {
    this.server.emit('onMessage', {
      user: client.data.user,
      message: payload,
      color: client.data.color,
    });
  }
}
