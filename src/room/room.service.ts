import { Injectable } from '@nestjs/common';
import { SocketGateway } from 'src/socket';
import { RoomRepository } from './room.repository';

@Injectable()
export class RoomService {
  constructor(
    private gateway: SocketGateway,
    private roomRepo: RoomRepository,
  ) {}

  randomString(length: number) {
    let result = '';
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
  }

  createRoom() {
    const roomCode = this.randomString(6).toLowerCase();
    // const existed = this.roomRepo.findExistingRoom(roomCode)
    this.gateway.server.emit('join-room', roomCode, 'host');
    return roomCode;
  }
}
