import { Controller, Post } from '@nestjs/common';
import { RoomService } from './room.service';

@Controller('room')
export class RoomController {
  constructor(private roomService: RoomService) {}

  @Post()
  create() {
    return this.roomService.createRoom();
  }
}
