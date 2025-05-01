import { Module } from '@nestjs/common';
import { ChatModule } from './chat/chat.module';
import { ConfigModule } from '@nestjs/config';
import { RoomModule } from './room/room.module';
import { SupabaseModule } from 'src/supabse/supabase.module';
import { MessageModule } from './message/message.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SupabaseModule,
    ChatModule,
    RoomModule,
    MessageModule,
  ],
})
export class AppModule {}
