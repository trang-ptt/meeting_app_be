import { Module } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';
import { SocketRepository } from './socket.repository';

@Module({
    providers: [SocketGateway, SocketRepository],
    exports: [SocketGateway]
})
export class SocketModule {}
