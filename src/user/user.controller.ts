import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { user } from '@prisma/client';
import { GetUser } from 'src/auth/decorator';
import { JwtGuard } from 'src/auth/guard';
import { UserService } from './user.service';

@ApiTags('User')
@UseGuards(JwtGuard)
@ApiBearerAuth()
@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('me')
  getMe(@GetUser() user: user) {
    return user;
  }
  @Get('search')
  async findUsersByNameAndEmail(@Query('name') name: string){
    try {
        const users = await this.userService.findUsersByNameAndEmail(name);
        if (users.length > 0) {
            return users;
        } else {
            return 'No users found';
        }
    } catch (error) {
        return 'Error while fetching users';
    }
  }
  @Get('all')
  async getAllUser(){
    return this.userService.getAllUser();
  }
}
