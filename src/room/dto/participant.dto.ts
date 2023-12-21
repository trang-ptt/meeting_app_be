import { ApiProperty } from "@nestjs/swagger";
import { user } from "@prisma/client";
import { ArrayMinSize, IsArray, IsEmail } from "class-validator";
export class ParticipantDTO {
  @ApiProperty()
  @IsArray()
  @IsEmail({}, { each: true })
  @ArrayMinSize(1)
  users: user[];
  }
  
 