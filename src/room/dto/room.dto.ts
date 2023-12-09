import { ApiProperty } from "@nestjs/swagger";
import { IsNumber } from "class-validator";

export class GetRoomTokenQueryDTO {
  @ApiProperty({
    required: false,
  })
  code: string;

  @ApiProperty({
    required: false,
  })
  @IsNumber()
  startTime: string;

  @ApiProperty({
    required: false,
  })
  @IsNumber()
  expireTime: string;

  @ApiProperty({
    required: false,
  })
  title: string;
}

export class RoomDTO {
    code: string
    startTime: Date
    endTime: Date
    hostId: number
    title: string
}

export class RoomTokenResponseDTO {
  @ApiProperty()
  rtcToken: string;

  @ApiProperty()
  code: string
}