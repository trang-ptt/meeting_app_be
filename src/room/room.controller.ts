import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { user } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import { GetUser } from 'src/auth/decorator';
import { JwtGuard } from 'src/auth/guard';
import { JoinUserDTO } from 'src/socket/dto';
import {
  CreateRoomDTO,
  GetRoomTokenQueryDTO,
  JoinRequestDTO,
  ParticipantDTO,
  RoomTokenResponseDTO,
} from './dto';
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

  @Get('participants/:code')
  async getParticipants(@Param('code') code: string) {
    try {
      return await this.roomService.getRoomParticipant(code);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  @Get('requestUsers/:code')
  async getRequestUsers(@Param('code') code: string) {
    try {
      return await this.roomService.getRequestUsers(code);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  @Get('chat/:code')
  async getChat(@Param('code') code: string) {
    try {
      return await this.roomService.getRoomChat(code);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  @ApiOperation({
    description: 'End meeting',
  })
  @Delete(':code')
  async endMeet(@Param('code') code: string, @GetUser() user: user) {
    try {
      return await this.roomService.endMeet(user, code);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  @Post('sendEmail/:code')
  async sendEmail(@Param('code') code: string, @Body() dto: ParticipantDTO) {
    const { emailList } = dto;
    return await this.roomService.sendEmailForAllParticipants(code, emailList);
  }

  @Post('create')
  async create(@GetUser() user: user, @Body() dto: CreateRoomDTO) {
    return await this.roomService.create(user, dto);
  }

  @Get('list')
  async getRoomList(@GetUser() user: user) {
    return await this.roomService.getScheduledRooms(user);
  }

  @Post('join')
  async requestToJoin(@GetUser() user: user, @Body() dto: JoinUserDTO) {
    return await this.roomService.requestToJoin(user, dto);
  }

  @Post('replyJoinRequest')
  async replyJoinRequest(@GetUser() user: user, @Body() dto: JoinRequestDTO) {
    return await this.roomService.replyJoinRequest(user, dto);
  }
}
