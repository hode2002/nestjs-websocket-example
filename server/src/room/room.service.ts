import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { Room } from './entities/room.entity';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Injectable()
export class RoomService {
  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  async findAll(): Promise<Room[]> {
    const { data, error } = await this.supabase.from('rooms').select('*');

    if (error) {
      throw error;
    }

    return data as Room[];
  }

  async findOne(id: string): Promise<Room> {
    const { data, error } = await this.supabase
      .from('rooms')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    return data as Room;
  }

  async create(createRoomDto: CreateRoomDto): Promise<Room> {
    const { data, error } = await this.supabase
      .from('rooms')
      .insert(createRoomDto)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as Room;
  }

  async update(id: string, updateRoomDto: UpdateRoomDto): Promise<Room> {
    const { data, error } = await this.supabase
      .from('rooms')
      .update(updateRoomDto)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as Room;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.from('rooms').delete().eq('id', id);

    if (error) {
      throw error;
    }
  }
}
