import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { RoomModule } from './room/room.module';
import { SocketModule } from './socket/socket.module';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SocketModule,
    RoomModule,
    AuthModule,
    PrismaModule,
    UserModule,
  ],
})
export class AppModule {}
