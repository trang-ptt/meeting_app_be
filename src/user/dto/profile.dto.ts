import { ApiProperty } from '@nestjs/swagger';

export class ProfileDto {
  @ApiProperty()
  name: string;

}
export class changePasswordDto {
    @ApiProperty()
    oldPass: string;
  
    @ApiProperty()
    newPass: string;
  
    @ApiProperty()
    confirmPass: string;
  }
