import { Controller, Get, Post, Query, Res } from '@nestjs/common';
import { RtcRole, RtcTokenBuilder } from 'agora-access-token';
import { NextFunction, Request, Response } from 'express';
import { APP_CERTIFICATE, APP_ID } from 'src/app.consts';
import { GetRoomTokenQueryDTO } from './dtos';
import { RoomService } from './room.service';

@Controller('room')
export class RoomController {
  constructor(private roomService: RoomService) {}

  nocache = (_: Request, resp: Response, next: NextFunction) => {
    resp.header(
      'Cache-Control',
      'private, no-cache, no-store, must-revalidate',
    );
    resp.header('Expires', '-1');
    resp.header('Pragma', 'no-cache');
    next();
  };

  @Post()
  create() {
    return this.roomService.createRoom();
  }

  @Get('/token')
  getToken(@Res() resp: Response, @Query() dto: GetRoomTokenQueryDTO) {
    const { code, uid } = dto;
    let role: number;
    if (dto.role === 'publisher') {
      role = RtcRole.PUBLISHER;
    } else {
      role = RtcRole.SUBSCRIBER;
    }

    // get the expire time
    const expireTime = dto.expireTime || '3600';
    const privilegeExpireTime =
      Math.floor(Date.now() / 1000) + parseInt(expireTime, 10);

    // build the token
    const token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      code,
      parseInt(uid),
      role,
      privilegeExpireTime,
    );

    // return the token
    return resp.json({ rtcToken: token });
  }
}
