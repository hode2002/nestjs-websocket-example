'use client'

import { useEffect, useRef, useState } from 'react';
import socket from '@/lib/socket';
import { useAuth } from '@clerk/nextjs';

export type Message = {
    roomId: string;
    sender: string;
    content: string;
}

export default function Chat() {
    const messagesEndRef = useRef(null);

    const [rooms, setRooms] = useState<string[]>(
        ['room-1', 'room-2']
    )
    const [currRoom, setCurrRoom] = useState<string>('')
    const [alert, setAlert] = useState<string>('')

    const [value, setValue] = useState('')
    const [messages, setMessages] = useState<Message[]>([])

    const { userId, isLoaded, isSignedIn } = useAuth();

    useEffect(() => {
        socket.on('connect', () => {
            console.log('Connected:', socket.id);
        });

        socket.on('message', (data) => {
            console.log('New message:', data);
            setMessages(prev => [...prev, data])
        });

        socket.on('user-joined', (data: { roomId: string; sender: string }) => {
            console.log(data.sender + ' joined room');
            setAlert(data.sender + ' joined room')
        });

        socket.on('room-message', (data) => {
            console.log('New message in room:', data);
            setMessages(prev => [...prev, data])
        });

        return () => {
            socket.off('message');
            socket.off('joined-room');
            socket.off('user-joined');
            socket.off('room-message');
        };
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const onsubmit = () => {
        console.log(value)
        const message = {
            sender: userId,
            content: value,
            roomId: currRoom
        }
        socket.emit('room-message', message)
        setValue('')
    }

    const joinRoom = (room: string) => {
        setCurrRoom(room)

        socket.emit('join-room', {
            sender: userId,
            roomId: room
        })
    }

    if (!isLoaded) {
        return <div className='w-screen h-screen flex justify-center items-center'>Loading...</div>;
    }

    if (!isSignedIn) {
        return <div className='w-screen h-screen flex justify-center items-center'>Sign in to chat</div>;
    }

    return <div className='flex w-screen'>
        <div className='w-2/12 bg-blue-200 px-2'>
            {rooms && rooms.length <= 0
                ? <p className='text-black flex justify-center py-1'>No message</p>
                : rooms.map(room =>
                    <div
                        key={room}
                        className={`py-2 px-4 my-1 text-black border rounded-md opacity-90 hover:bg-black/40 hover:text-white hover:cursor-pointer bg-amber-50 ${room === currRoom ? 'bg-blue-500' : ''}`}
                        onClick={() => joinRoom(room)}
                    >
                        {room}
                    </div>
                )}
        </div>

        <div className='w-10/12 flex gap-2'>
            <div className='p-4 bg-amber-50 text-black w-full'>
                {alert && <p>{alert}</p>}

                <div className='bg-amber-50 h-[75vh] overflow-y-auto'>
                    {messages && messages.length <= 0 && !alert
                        ? <p>No message</p>
                        : <div className='bg-amber-50'>
                            {messages.map((msg, index) =>
                                <div key={index}>
                                    {msg.sender === userId
                                        ? <div className='w-fit border my-2 bg-blue-200 ml-auto rounded-4xl px-4 py-2'>
                                            <p className='text-xs'>{msg.sender}</p>
                                            <p className='mt-1'>{msg.content}</p>
                                        </div>
                                        : <div className='w-fit border my-2 bg-blue-200 rounded-4xl px-4 py-2'>
                                            <p className='text-xs'>{msg.sender}</p>
                                            <p className='mt-1'>{msg.content}</p>
                                        </div>
                                    }
                                </div>
                            )}
                        </div>
                    }
                    <div ref={messagesEndRef} />
                </div>

                {currRoom && <div className='fixed bottom-0 left-0 right-0 bg-amber-50 flex justify-center p-4 gap-2'>
                    <input
                        type="text"
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        placeholder='enter text here...'
                        className='text-black w-3/4 px-2 py-4 border'
                    />
                    <button
                        onClick={onsubmit}
                        disabled={!value}
                        className='disabled:bg-black/65 disabled:hover:cursor-not-allowed bg-black text-white hover:bg-black/65 hover:cursor-pointer py-2 px-4'>
                        send
                    </button>
                </div>
                }
            </div>
        </div>
    </div>
}
