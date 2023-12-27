import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class JoinUserDTO {
  @ApiProperty()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    default: false,
  })
  micStatus: boolean;

  @ApiProperty({
    default: false,
  })
  camStatus: boolean;
}

export class RoomMessageDTO {
  code: string;
  message: string;
}
