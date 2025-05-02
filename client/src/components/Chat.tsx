'use client'

import { useEffect, useRef, useState } from 'react';
import socket from '@/lib/socket';
import { useAuth, useUser } from '@clerk/nextjs';
import { ImagePlusIcon, Mic, Pause } from 'lucide-react';
import Image from 'next/image';
import { getAllRooms } from '@/lib/api/room';
import { getRoomMessages } from '@/lib/api/message';

export type Message = {
    roomId: string;
    sender: string;
    content: string;
    type: 'audio' | 'text' | 'image' | 'alert';
}

export type Room = {
    id: string,
    room_id: string;
    name: string,
}

export type User = {
    userId: string,
    name: string,
    avatar: string,
}

export default function Chat() {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const [users, setUsers] = useState<User[]>([])
    const [rooms, setRooms] = useState<Room[]>([])
    const [currRoom, setCurrRoom] = useState<string>('')

    const [value, setValue] = useState('')
    const [messages, setMessages] = useState<Message[]>([])

    const { userId, isLoaded, isSignedIn } = useAuth();
    const { user } = useUser();

    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const rooms = await getAllRooms();
                setRooms(rooms.filter(r => r.room_id === r.id));
            } catch (error) {
                console.error('Error fetching rooms:', error);
            }
        };
        fetchRooms();

        socket.on('connect', () => {
            console.log('Connected:', socket.id);
        });

        socket.emit('join', {
            userId,
            avatar: user?.imageUrl,
            name: user?.fullName,
        });

        socket.on('online-users', (data) => {
            console.log('Users online:', data);
            setUsers(data.filter(u => u.userId !== userId))
        });

        socket.on('message', (data) => {
            console.log('New message:', data);
            setMessages(prev => [...prev, data])
        });

        socket.on('user-joined', (data) => {
            console.log(data.sender + ' joined room');
            setMessages(prev => [...prev, data])
        });

        socket.on('room-message', (data) => {
            console.log('New message in room:', data);
            setMessages(prev => [...prev, data])
        });

        socket.on('upload-success', (data) => {
            console.log('file upload successfully', data)
            setMessages(prev => [...prev, data])
            setIsUploading(false);
        });

        return () => {
            socket.off('message');
            socket.off('joined-room');
            socket.off('user-joined');
            socket.off('room-message');
            socket.off('upload-success');
            socket.off('online-users');
            setCurrRoom('')
        };
    }, [user]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!currRoom) return
        setMessages([])

        const fetchRoomMessages = async () => {
            try {
                const roomMessages = await getRoomMessages(currRoom);
                setMessages(roomMessages);
            } catch (error) {
                console.error('Error fetching room message:', error);
            }
        };
        fetchRoomMessages();
    }, [currRoom]);

    const onsubmit = () => {
        console.log(value)
        const message = {
            sender: userId,
            content: value,
            roomId: currRoom,
            type: 'text'
        }
        socket.emit('room-message', message)
        setValue('')
    }

    const joinRoom = (roomId: string) => {
        setCurrRoom(roomId)

        socket.emit('join-room', {
            sender: userId,
            roomId
        })
    }

    const handleSend = () => {
        const file = inputRef.current?.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('MIME type not allowed');
            return;
        }

        setIsUploading(true);

        const reader = new FileReader();
        reader.onload = () => {
            if (reader.result) {
                const base64 = reader.result.toString().split(',')[1];
                socket.emit('upload-file', {
                    roomId: currRoom,
                    sender: userId,
                    name: file.name,
                    type: file.type,
                    content: base64,
                });
            }
        };
        reader.readAsDataURL(file);

        if (inputRef.current) {
            inputRef.current.value = "";
        }
    };

    const startRecording = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                audioChunks.current.push(e.data);
            }
        };

        recorder.onstop = async () => {
            setIsUploading(true);
            const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
            const base64 = await blobToBase64(blob);

            socket.emit('upload-file', {
                roomId: currRoom,
                sender: userId,
                type: 'audio',
                content: base64,
            });

            audioChunks.current = [];
        };

        recorder.start();
        mediaRecorder.current = recorder;
        setIsRecording(true);
    };

    const stopRecording = () => {
        mediaRecorder.current?.stop();
        setIsRecording(false);
    };

    const blobToBase64 = (blob: Blob): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64data = reader.result?.toString().split(',')[1];
                resolve(base64data || '');
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

    if (!isLoaded) {
        return <div className='w-screen h-screen flex justify-center items-center'>Loading...</div>;
    }

    if (!isSignedIn) {
        return <div className='w-screen h-screen flex justify-center items-center'>Sign in to chat</div>;
    }

    return <div className='flex w-screen'>
        {isUploading && <div className='flex justify-center items-center bg-black/40 z-50 fixed top-0 bottom-0 right-0 left-0'>
            <Image
                src={'/loading.gif'}
                alt='loading'
                width={100}
                height={100}
            />
        </div>}

        {isRecording && <div className='flex justify-center items-center bg-black/40 z-50 fixed top-0 bottom-24 right-0 left-0'>
            <Image
                src={'/recording.gif'}
                alt='loading'
                className='rounded-md'
                width={500}
                height={500}
            />
        </div>}

        <div className='w-2/12 bg-blue-200 px-2'>
            {rooms && rooms.length <= 0
                ? <p className='text-black flex justify-center py-1'>No message</p>
                : rooms.map(room =>
                    <div
                        key={room.id}
                        className={`py-2 px-4 my-1 text-black border rounded-md opacity-90 hover:bg-black/40 hover:text-white hover:cursor-pointer bg-amber-50 ${room.room_id === currRoom ? 'bg-blue-500' : ''}`}
                        onClick={() => joinRoom(room.id)}
                    >
                        {room.name}
                    </div>
                )}

            {users && users.length > 0 && users.map((user) =>
                <div
                    key={user?.userId}
                    className={`py-2 px-4 my-1 text-black border rounded-md opacity-90 hover:bg-black/40 hover:text-white hover:cursor-pointer bg-amber-50 ${[userId, user.userId].sort().join('-') === currRoom ? 'bg-blue-500' : ''}`}
                    onClick={() => joinRoom([userId, user.userId].sort().join('-'))}
                >
                    <Image src={user?.avatar} className='rounded-full' width={25} height={25} alt='user avatar' />
                    <p className='w-full truncate'>{user.name}</p>
                </div>
            )}
        </div>

        <div className='w-10/12 flex gap-2'>
            <div className='p-4 bg-amber-50 text-black w-full'>

                <div className='bg-amber-50 h-[75vh] overflow-y-auto'>
                    {messages && messages.length <= 0 && !alert
                        ? <p>No message</p>
                        : <div className='bg-amber-50'>
                            {messages.map((msg, index) =>
                                <div key={index}>
                                    {msg.sender === userId
                                        ? <div className='w-fit border my-2 bg-blue-200 ml-auto rounded-4xl px-4 py-2'>
                                            {msg.type === 'alert'
                                                ? <p className='text-xs'>{msg.content}</p>
                                                : <>
                                                    <p className='text-xs'>{msg.sender}</p>
                                                    {msg.type === 'text' ?
                                                        <p className='mt-1'>{msg.content}</p>
                                                        : msg.type === 'audio'
                                                            ? <audio
                                                                controls
                                                                src={msg.content}
                                                                className='mt-1'
                                                            />
                                                            : <Image
                                                                src={msg.content}
                                                                alt=''
                                                                className='mt-1'
                                                                width={100}
                                                                height={100}
                                                            />
                                                    }
                                                </>
                                            }
                                        </div>
                                        : <div className='w-fit border my-2 bg-blue-200 rounded-4xl px-4 py-2'>
                                            {msg.type === 'alert'
                                                ? <p className='text-xs'>{msg.content}</p>
                                                : <>
                                                    <p className='text-xs'>{msg.sender}</p>
                                                    {msg.type === 'text' ?
                                                        <p className='mt-1'>{msg.content}</p>
                                                        : msg.type === 'audio'
                                                            ? <audio
                                                                controls
                                                                src={msg.content}
                                                                className='mt-1'
                                                            />
                                                            : <Image
                                                                src={msg.content}
                                                                alt=''
                                                                className='mt-1'
                                                                width={100}
                                                                height={100}
                                                            />
                                                    }
                                                </>
                                            }
                                        </div>
                                    }
                                </div>
                            )}
                        </div>
                    }
                    <div ref={messagesEndRef} />
                </div>

                {currRoom &&
                    <>
                        <div className='fixed bottom-0 left-0 right-0 bg-amber-50 flex justify-center p-4 gap-2'>
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
                                className='disabled:bg-black/65 disabled:hover:cursor-not-allowed rounded-md bg-black text-white hover:bg-black/65 hover:cursor-pointer py-2 px-4'>
                                send
                            </button>

                            <input
                                type="file"
                                id='file-upload'
                                hidden
                                ref={inputRef}
                                onChange={handleSend}
                                accept="image/*"
                            />

                            <label
                                htmlFor="file-upload"
                                className='cursor-pointer flex items-center gap-2 p-4 border rounded-md'>
                                <ImagePlusIcon className='w-8 h-8' />
                            </label>

                            {isRecording
                                ? <label
                                    onClick={stopRecording}
                                    className='cursor-pointer flex items-center gap-2 p-4 border rounded-md'>
                                    <Pause className='w-8 h-8' />
                                </label>
                                : <label
                                    onClick={startRecording}
                                    className='cursor-pointer flex items-center gap-2 p-4 border rounded-md'>
                                    <Mic className='w-8 h-8' />
                                </label>
                            }
                        </div>
                    </>
                }
            </div>
        </div>
    </div >
}
