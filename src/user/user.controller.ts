import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { user } from '@prisma/client';
import { GetUser } from 'src/auth/decorator';
import { JwtGuard } from 'src/auth/guard';

@ApiTags('User')
@UseGuards(JwtGuard)
@ApiBearerAuth()
@Controller('user')
export class UserController {
  constructor() {}

  @Get('me')
  getMe(@GetUser() user: user) {
    return user;
  }
}
