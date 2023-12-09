import { Module } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';
import { SocketRepository } from './socket.repository';
import { AuthModule } from 'src/auth/auth.module';

@Module({
    providers: [SocketGateway, SocketRepository],
    exports: [SocketGateway],
    imports: [AuthModule]
})
export class SocketModule {}
