import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsEmail, IsNotEmpty } from 'class-validator';
export class ParticipantDTO {
  @ApiProperty()
  @IsArray()
  @IsEmail({}, { each: true })
  @ArrayMinSize(1)
  emailList: string[];
}

export class JoinRequestDTO {
  @ApiProperty()
  @IsNotEmpty()
  uid: number;

  @ApiProperty()
  @IsNotEmpty()
  code: string;

  @IsNotEmpty()
  @ApiProperty()
  accept: boolean
}