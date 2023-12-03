import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { user } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import { GetUser } from 'src/auth/decorator';
import { JwtGuard } from 'src/auth/guard';
import { GetRoomTokenQueryDTO, RoomTokenResponseDTO } from './dto';
import { RoomService } from './room.service';

@ApiTags('Room')
@UseGuards(JwtGuard)
@ApiBearerAuth()
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

  @ApiResponse({
    type: RoomTokenResponseDTO,
  })
  @Get('/token')
  async getToken(
    @Res() resp: Response,
    @Query() dto: GetRoomTokenQueryDTO,
    @GetUser() user: user,
  ) {
    try {
      const result = await this.roomService.getRoomToken(dto, user);
      return resp.json(result);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}
