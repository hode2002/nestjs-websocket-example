import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  sender: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsEnum(['audio', 'text', 'image', 'alert'])
  @IsNotEmpty()
  type: 'audio' | 'text' | 'image' | 'alert';
}
