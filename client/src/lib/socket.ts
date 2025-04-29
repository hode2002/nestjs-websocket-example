import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  // auth: {
  //   token: 'jwt-token',
  // },
});

export default socket;
