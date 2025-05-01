import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { Message } from './entities/message.entity';

@Injectable()
export class MessageService {
  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  async create(createMessageDto: CreateMessageDto): Promise<Message> {
    const { data, error } = await this.supabase
      .from('messages')
      .insert(createMessageDto)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as Message;
  }

  async findAll(): Promise<Message[]> {
    const { data, error } = await this.supabase.from('messages').select('*');

    if (error) {
      throw error;
    }

    return data as Message[];
  }

  async findOne(id: string): Promise<Message> {
    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    return data as Message;
  }

  async findByRoomId(roomId: string): Promise<Message[]> {
    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return data as Message[];
  }

  async update(
    id: string,
    updateMessageDto: UpdateMessageDto,
  ): Promise<Message> {
    const { data, error } = await this.supabase
      .from('messages')
      .update(updateMessageDto)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as Message;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('messages')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  }
}
