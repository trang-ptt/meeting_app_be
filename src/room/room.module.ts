import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { NoCacheMiddleware } from 'src/middleware';
import { SocketModule } from 'src/socket';
import { RoomController } from './room.controller';
import { RoomRepository } from './room.repository';
import { RoomService } from './room.service';

@Module({
  controllers: [RoomController],
  providers: [RoomService, RoomRepository],
  imports: [SocketModule],
})
export class RoomModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(NoCacheMiddleware).forRoutes('*');
  }
}
