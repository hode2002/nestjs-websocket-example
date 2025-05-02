import { Inject } from '@nestjs/common';
import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { SupabaseClient } from '@supabase/supabase-js';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  connectedUsers = new Map<string, object>();

  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);

    this.connectedUsers.delete(client.id);
    console.log('connectedUsers', Array.from(this.connectedUsers));
    this.server.emit('online-users', Array.from(this.connectedUsers.values()));
  }

  @SubscribeMessage('message')
  handleMessage(@MessageBody() data: { sender: string; content: string }) {
    this.server.emit('message', data);
  }

  @SubscribeMessage('join')
  handleJoin(
    @MessageBody()
    data: {
      userId: string;
      avatar: string;
      name: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    this.connectedUsers.set(client.id, data);
    console.log({ connectedUsers: Array.from(this.connectedUsers) });
    this.server.emit('online-users', Array.from(this.connectedUsers.values()));
  }

  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @MessageBody() data: { roomId: string; sender: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { data: existingRoom } = await this.supabase
      .from('rooms')
      .select('*')
      .eq('room_id', data.roomId)
      .single();

    if (!existingRoom) {
      await this.supabase
        .from('rooms')
        .insert({
          name: '',
          room_id: data.roomId,
        })
        .select()
        .single();
    }

    client.join(data.roomId);

    await this.supabase.from('messages').insert({
      sender: data.sender,
      content: data.sender + ' joined room',
      type: 'alert',
      room_id: data.roomId,
    });

    this.server.to(data.roomId).emit('user-joined', {
      ...data,
      type: 'alert',
      content: data.sender + ' joined room',
    });
  }

  @SubscribeMessage('room-message')
  async handleRoomMessage(
    @MessageBody()
    data: {
      roomId: string;
      sender: string;
      content: string;
      type: string;
    },
  ) {
    await this.supabase.from('messages').insert({
      sender: data.sender,
      content: data.content,
      type: data.type,
      room_id: data.roomId,
    });
    this.server.to(data.roomId).emit('room-message', data);
  }

  @SubscribeMessage('upload-file')
  async handleFileUpload(
    @MessageBody()
    data: {
      name: string;
      type: string;
      content: string;
      roomId: string;
      sender: string;
    },
  ) {
    const buffer = Buffer.from(data.content, 'base64');
    const fileName = uuidv4();

    await this.supabase.storage.from('uploads').upload(fileName, buffer, {
      contentType: data.type,
      upsert: false,
    });

    const { data: publicUrl } = this.supabase.storage
      .from('uploads')
      .getPublicUrl(fileName);
    const url = publicUrl.publicUrl;

    const record = {
      sender: data.sender,
      content: url,
      type: data.type,
      room_id: data.roomId,
    };

    await this.supabase.from('messages').insert(record);

    this.server.to(data.roomId).emit('upload-success', record);
  }
}
