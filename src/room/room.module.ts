import { Module } from '@nestjs/common';
import { RoomController } from './room.controller';
import { RoomService } from './room.service';
import { RoomRepository } from './room.repository';
import { SocketModule } from 'src/socket';

@Module({
  controllers: [RoomController],
  providers: [RoomService, RoomRepository],
  imports: [SocketModule],
})
export class RoomModule {}
