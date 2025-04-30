'use client'

import { useEffect, useRef, useState } from 'react';
import socket from '@/lib/socket';
import { useAuth } from '@clerk/nextjs';
import { ImagePlusIcon, Mic, Pause } from 'lucide-react';
import Image from 'next/image';

export type Message = {
    roomId: string;
    sender: string;
    content: string;
    type: 'audio' | 'text' | 'image' | 'alert';
}

export default function Chat() {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);
    const [isRecording, setIsRecording] = useState(false);

    const [rooms, setRooms] = useState<string[]>(
        ['room-1', 'room-2']
    )
    const [currRoom, setCurrRoom] = useState<string>('')

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
        });

        return () => {
            socket.off('message');
            socket.off('joined-room');
            socket.off('user-joined');
            socket.off('room-message');
            socket.off('upload-success');
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
            roomId: currRoom,
            type: 'text'
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

    const handleSend = () => {
        const file = inputRef.current?.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('MIME type not allowed');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            socket.emit('upload-file', {
                roomId: currRoom,
                sender: userId,
                name: file.name,
                type: file.type,
                content: reader.result, // base64
            });
        };
        reader.readAsDataURL(file);

        if (inputRef.current) {
            inputRef.current = null;
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
            const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
            const base64 = await blobToBase64(blob);

            socket.emit('upload-file', {
                roomId: currRoom,
                sender: userId,
                type: 'audio',
                content: `data:audio/webm;base64,${base64}`,
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
