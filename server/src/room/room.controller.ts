import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
} from '@nestjs/common';
import { RoomService } from './room.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { Room } from './entities/room.entity';

@Controller('rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  async create(@Body() createRoomDto: CreateRoomDto): Promise<Room> {
    return this.roomService.create(createRoomDto);
  }

  @Get()
  async findAll(): Promise<Room[]> {
    return this.roomService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Room> {
    return this.roomService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateRoomDto: UpdateRoomDto,
  ): Promise<Room> {
    return this.roomService.update(id, updateRoomDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.roomService.remove(id);
  }
}
