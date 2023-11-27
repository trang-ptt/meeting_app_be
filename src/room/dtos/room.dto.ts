import { IsNotEmpty, IsNumber } from "class-validator";

export class GetRoomTokenQueryDTO {
  @IsNotEmpty()
  code: string;

  @IsNumber()
  uid: string;
  role: string;
  
  @IsNumber()
  expireTime: string;
}
