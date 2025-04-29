import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('message')
  handleMessage(@MessageBody() data: { sender: string; content: string }) {
    console.log('Received message:', data);
    this.server.emit('message', data);
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @MessageBody() data: { roomId: string; sender: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.roomId);
    this.server.to(data.roomId).emit('user-joined', data);
    console.log('user: ' + client.id + ' joined room: ' + data.roomId);
  }

  @SubscribeMessage('room-message')
  handleRoomMessage(
    @MessageBody() data: { roomId: string; sender: string; content: string },
  ) {
    console.log('room-message: ', data);
    this.server.to(data.roomId).emit('room-message', data);
  }
}
