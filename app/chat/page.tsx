'use client';

import { useEffect, useState } from 'react';
import { socket } from '@/lib/socket';
import { api } from '@/lib/api';
import { useRef } from 'react';


interface User {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
    isOnline?: boolean;
    socketId?: string;
}

interface Message {
    _id?: string;
    senderId: string;
    text?: string;
    fileUrl?: string;
    type: string;
    format?: string;
    duration?: number;
    createdAt?: string;
    status?: 'sent' | 'seen' | 'delivered';
}

export default function ChatPage() {
    const peerRef = useRef<RTCPeerConnection | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const messagesEndRef =
        useRef<HTMLDivElement | null>(null);
    const [showUsers, setShowUsers] =
        useState(true);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [chatId, setChatId] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState('');
    const [callDuration, setCallDuration] =
        useState(0);
    const [incomingCall, setIncomingCall] = useState<any>(null);
    const [isCalling, setIsCalling] = useState(false);
    const [callStatus, setCallStatus] = useState('');
    const [callStartTime, setCallStartTime] =
        useState<number | null>(null);
    const [callConnected, setCallConnected] =
        useState(false);
    const chatIdRef = useRef('');
    const [localStream, setLocalStream] =

        useState<MediaStream | null>(null);
    const pendingCandidates = useRef<any[]>([]);
    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
    const currentUser =
        typeof window !== 'undefined'
            ? JSON.parse(localStorage.getItem('user') || '{}')
            : {};
    const [typingUser, setTypingUser] = useState('');
    const [callType, setCallType] = useState<'audio' | 'video'>('audio');
    const [currentCallType, setCurrentCallType] =
        useState<'audio' | 'video'>('audio');

    const currentCallTypeRef =
        useRef<'audio' | 'video'>('audio');
    const missedCallTimer =
        useRef<any>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const recordingStreamRef = useRef<MediaStream | null>(null);
    const recordingChunksRef = useRef<Blob[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const remoteStreamRef = useRef<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] =
        useState<MediaStream | null>(null);
    useEffect(() => {
        loadUsers();

        socket.connect();

        socket.emit('registerUser', {
            userId: currentUser.id,
        });

        socket.on('connect', () => {
            console.log('Socket Connected:', socket.id);
        });
        socket.on('incomingCall', (data) => {
            setCallStatus(
                `${data.callerName} is calling you...`
            );
            setCurrentCallType(data.callType);
            currentCallTypeRef.current = data.callType;
            console.log('INCOMING CALL EVENT');
            console.log(data);


            setIncomingCall(data);
            missedCallTimer.current = setTimeout(() => {
                if (peerRef.current) return;

                socket.emit('missedCall', {
                    chatId: data.chatId,
                    callerId: data.callerId,
                    callerSocketId: data.callerSocketId,
                    callType: data.callType,
                });

                setIncomingCall(null);
                setCallStatus('');
                setIsCalling(false);
                setCallConnected(false);
                setCallStatus('Missed Call');
            }, 30000);
        });
        socket.on(
            'callMissed',
            (data) => {
                setIsCalling(false);
                setCallConnected(false);

                peerRef.current?.close();
                peerRef.current = null;

                localStream
                    ?.getTracks()
                    .forEach((track) =>
                        track.stop(),
                    );

                setLocalStream(null);

                setCallStatus(
                    data.callType === 'video'
                        ? 'Video Call Missed'
                        : 'Audio Call Missed',
                );

                loadMessages(
                    chatIdRef.current,
                );

                setTimeout(() => {
                    setCallStatus('');
                }, 3000);
            },
        );
        socket.on('callAccepted', async (data) => {

            setCallStatus('Call Connected');
            setCallStartTime(Date.now());
            if (!peerRef.current) return;

            await peerRef.current.setRemoteDescription(
                new RTCSessionDescription(data.answer),
            );
            for (const candidate of pendingCandidates.current) {
                await peerRef.current.addIceCandidate(
                    candidate ? new RTCIceCandidate(candidate) : null
                );
            }

            pendingCandidates.current = [];
        });
        socket.on('iceCandidate', async (candidate) => {
            console.log(
                'RECEIVED ICE',
                candidate?.usernameFragment || 'END'
            );

            console.log(
                'REMOTE UFRAG',
                peerRef.current?.remoteDescription?.sdp.match(
                    /a=ice-ufrag:(.*)/,
                )?.[1]
                || 'NO_REMOTE_DESC'
            );
            try {


                console.log('RECEIVED ICE', candidate);

                if (!peerRef.current) {
                    pendingCandidates.current.push(candidate);
                    return;
                }

                if (!peerRef.current.remoteDescription) {
                    console.log('QUEUE ICE', candidate);
                    pendingCandidates.current.push(candidate);
                    return;
                }

                await peerRef.current.addIceCandidate(
                    candidate ? new RTCIceCandidate(candidate) : null
                );

                console.log('ICE ADDED');
            } catch (error) {
                console.log('ICE candidate ignored:', error);
            }
        });

        socket.on('userStatusChanged', () => {
            loadUsers();
        });
        socket.on('callEnded', () => {

            setCallConnected(false);
            pendingCandidates.current = [];
            setCallDuration(0);
            setCallStartTime(null);
            setCallStatus('Call Ended');
            setRemoteStream(null);
            remoteStreamRef.current = null;

            peerRef.current?.close();
            peerRef.current = null;

            localStream?.getTracks().forEach(
                track => track.stop(),
            );
            if (localVideoRef.current)
                localVideoRef.current.srcObject = null;

            if (remoteVideoRef.current)
                remoteVideoRef.current.srcObject = null;
            setLocalStream(null);
            setTimeout(() => {
                loadMessages(chatId);
            }, 500);
            setTimeout(() => {
                setCallStatus('');
            }, 2000);
        });
        socket.on('newMessage', (message) => {
            setMessages((prev) => [...prev, message]);
            if (message.senderId !== currentUser.id) {
                socket.emit('messageSeen', {
                    chatId: chatIdRef.current,
                    userId: currentUser.id,
                    messageType: message.type,
                });
            }
        });
        socket.on('callRejected', (data) => {
            setIsCalling(false);
            pendingCandidates.current = [];
            setCallConnected(false);
            if (data.callType === 'video') {
                setCallStatus('Video Call Rejected');
            } else {
                setCallStatus('Audio Call Rejected');
            }


            loadMessages(chatId);
            peerRef.current?.close();
            peerRef.current = null;

            localStream?.getTracks().forEach(track =>
                track.stop(),
            );

            setLocalStream(null);
        });

        socket.on('userTyping', (data) => {
            if (data.userId !== currentUser.id) {
                setTypingUser(`${data.name} is typing...`);
                setTimeout(() => {
                    setTypingUser('');
                }, 2000);
            }
        });

        socket.on('userStopTyping', () => {
            setTypingUser('');
        });

        socket.on('messagesSeen', (data) => {
            console.log('MESSAGES SEEN RECEIVED');
            console.log(data);
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.senderId === currentUser.id
                        ? {
                            ...msg,
                            status: 'seen',
                        }
                        : msg,
                ),
            );
        });
        return () => {
            socket.off('incomingCall');
            socket.off('callAccepted');
            socket.off('iceCandidate');
            socket.off('userStatusChanged');
            socket.off('callEnded');
            socket.off('newMessage');
            socket.off('callRejected');
            socket.off('userTyping');
            socket.off('userStopTyping');
            socket.off('messagesSeen');
            clearTimeout(missedCallTimer.current);
        };
    }, []);


    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: 'smooth',
        });
    }, [messages]);

    useEffect(() => {
        if (selectedUser && messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({
                behavior: 'auto',
            });
        }
    }, [selectedUser]);

    useEffect(() => {
        if (!callConnected) return;

        const timer = setInterval(() => {
            setCallDuration(
                Math.floor(
                    (Date.now() -
                        (callStartTime || 0)) /
                    1000,
                ),
            );
        }, 1000);

        return () => clearInterval(timer);
    }, [callConnected, callStartTime]);
    useEffect(() => {
        if (
            callConnected &&
            currentCallType === "video" &&
            remoteVideoRef.current &&
            remoteStreamRef.current
        ) {
            console.log("RESTORING REMOTE STREAM");

            remoteVideoRef.current.srcObject =
                remoteStreamRef.current;

            remoteVideoRef.current.play()
                .catch(console.error);
        }
    }, [callConnected, currentCallType]);
    useEffect(() => {
        console.log(
            "VIDEO SCREEN RENDERED",
            !!remoteVideoRef.current
        );

        if (
            remoteVideoRef.current &&
            remoteStreamRef.current
        ) {
            console.log(
                "REATTACHING VIDEO"
            );

            remoteVideoRef.current.srcObject =
                remoteStreamRef.current;

            remoteVideoRef.current.play()
                .catch(console.error);
        }
    }, [callConnected, currentCallType]);
    useEffect(() => {
        if (
            currentCallType === 'video' &&
            callConnected &&
            localStream &&
            localVideoRef.current
        ) {
            localVideoRef.current.srcObject = localStream;
            localVideoRef.current.play().catch(console.error);
        }
    }, [currentCallType, callConnected, localStream]);

    useEffect(() => {
        console.log(
            "REMOTE VIDEO REF",
            remoteVideoRef.current
        );
    }, [callConnected]);

    useEffect(() => {
        if (
            remoteVideoRef.current &&
            remoteStream
        ) {
            remoteVideoRef.current.srcObject =
                remoteStream;
        }
    }, [remoteStream]);
    const loadUsers = async () => {
        try {
            const res = await api.get('/auth/users');

            setUsers(
                res.data.filter(
                    (user: User) => user._id !== currentUser.id,
                ),
            );

        } catch (error) {
            console.error(error);
        }
    };
    const createPeer = () => {


        const peer = new RTCPeerConnection({
            iceTransportPolicy: 'all',
            iceServers: [
                {
                    urls: "stun:turn.chat-app-1029.work.gd:3478"
                },

                {
                    urls: "turn:turn.chat-app-1029.work.gd:3478?transport=udp",
                    username: "bilal",
                    credential: "BilalTurn123",
                },
                {
                    urls: "turn:turn.chat-app-1029.work.gd:3478?transport=tcp",
                    username: "bilal",
                    credential: "BilalTurn123",
                },
            ],
        });

        peer.ontrack = (event) => {
            const stream = event.streams[0];
            console.log(
                "STREAM VIDEO TRACKS:",
                stream.getVideoTracks().length
            );

            console.log(
                "STREAM AUDIO TRACKS:",
                stream.getAudioTracks().length
            );

            stream.getVideoTracks().forEach(track => {
                console.log(
                    "VIDEO TRACK READY STATE:",
                    track.readyState
                );

                console.log(
                    "VIDEO TRACK ENABLED:",
                    track.enabled
                );
            });
            if (
                remoteStreamRef.current?.id !== stream.id
            ) {
                remoteStreamRef.current = stream;
                setRemoteStream(stream);
            }
            console.log("TRACK KIND:", event.track.kind);

            if (event.track.kind === "video") {
                console.log("VIDEO TRACK RECEIVED");

                console.log(
                    "REMOTE VIDEO REF EXISTS:",
                    !!remoteVideoRef.current
                );

                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = stream;

                    console.log(
                        "VIDEO ATTACHED"
                    );

                    remoteVideoRef.current.play()
                        .catch(console.error);
                } else {
                    console.log(
                        "VIDEO REF NULL"
                    );
                }
            }

            if (event.track.kind === "audio") {
                if (remoteAudioRef.current) {
                    remoteAudioRef.current.srcObject = stream;
                    remoteAudioRef.current.play().catch(console.error);
                }
            }
        };
        peer.onicecandidate = (event) => {
            if (!event.candidate || !event.candidate.candidate) {
                return;
            }
            if (event.candidate) {
                console.log(
                    "ICE CANDIDATE:",
                    event.candidate.type,
                    event.candidate.candidate
                );
            }
        };

        peer.onicegatheringstatechange = () => {
            console.log(
                "ICE GATHERING:",
                peer.iceGatheringState
            );
        };
        peer.oniceconnectionstatechange = () => {
            console.log(
                'ICE STATE:',
                peer.iceConnectionState,
            );
            console.log(
                "LOCAL CANDIDATE:",
                peer.localDescription
            );

            console.log(
                "REMOTE CANDIDATE:",
                peer.remoteDescription
            );
        };

        peer.onconnectionstatechange = () => {

            console.log(
                'CONNECTION STATE:',
                peer.connectionState,
            );

            if (peer.connectionState === 'connected') {

                setIsCalling(false);
                setCallConnected(true);
                setCallStatus('Call Connected');
            }

            if (
                peer.connectionState === 'disconnected' ||
                peer.connectionState === 'closed'
            ) {

                setIsCalling(false);
                setCallConnected(false);
                setCallStatus('Call Ended');
            }

            if (
                peer.connectionState === 'failed'
            ) {

                setIsCalling(false);
                setCallConnected(false);
                setCallStatus('Call Failed');
            }
        };
        peer.onicecandidateerror = (e) => {
            console.log("ICE ERROR", e);
        };
        peerRef.current = peer;

        return peer;
    };
    const loadMessages = async (id: string) => {
        if (!id) return;

        const messagesRes = await api.get(
            `/chat/${id}/history`,
        );

        setMessages(messagesRes.data);
    };
    const startChat = async (user: User) => {
        try {
            setSelectedUser(user);
            if (window.innerWidth < 768) {
                setShowUsers(false);
            }
            const res = await api.post('/chat/create', {
                user1: currentUser.id,
                user2: user._id,
            });

            setChatId(res.data._id);
            chatIdRef.current = res.data._id;
            socket.emit('messageSeen', {
                chatId: res.data._id,
                userId: currentUser.id,
            });
            socket.emit('joinChat', {
                chatId: res.data._id,
            });

            loadMessages(res.data._id);
        } catch (error) {
            console.error(error);
        }
    };

    const sendMessage = () => {
        if (!text.trim()) return;

        socket.emit('sendMessage', {
            chatId,
            senderId: currentUser.id,
            text,
            type: 'text',
        });

        setText('');
    };

    const uploadFile = async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        const res = await api.post('/upload', formData);

        socket.emit('sendMessage', {
            chatId,
            senderId: currentUser.id,
            fileUrl: res.data.url,
            type: res.data.type,
        });

    };
    const getMediaStream = async (
        type: 'audio' | 'video',
    ) => {
        if (
            typeof navigator === 'undefined' ||
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {
            alert(
                'Camera/microphone is not available. Use HTTPS or open this app on localhost/device browser that supports WebRTC.'
            );

            throw new Error(
                'getUserMedia is not available',
            );
        }

        return navigator.mediaDevices.getUserMedia({
            audio: true,
            video: type === 'video',
        });
    };
    const callUser = async (type: 'audio' | 'video') => {
        setCallType(type);
        setCurrentCallType(type);
        currentCallTypeRef.current = type;
        console.log("selectedUser", selectedUser)
        if (!selectedUser?.socketId) {
            alert('User offline');
            return;
        }

        try {
            const stream = await getMediaStream(type);
            console.log(
                "LOCAL VIDEO TRACKS:",
                stream.getVideoTracks().length
            );

            console.log(
                "LOCAL AUDIO TRACKS:",
                stream.getAudioTracks().length
            );
            setLocalStream(stream);
            if (
                type === 'video' &&
                localVideoRef.current
            ) {
                localVideoRef.current.srcObject =
                    stream;
            }
            pendingCandidates.current = [];

            peerRef.current?.close();
            peerRef.current = null;
            const peer = createPeer();

            peerRef.current = peer;
            console.log(
                "LOCAL TRACKS:",
                stream.getTracks().map(t => ({
                    kind: t.kind,
                    enabled: t.enabled
                }))
            );
            stream.getTracks().forEach((track) => {
                peer.addTrack(track, stream);
            });

            peer.onicecandidate = (event) => {
                if (!event.candidate) return;
                socket.emit('iceCandidate', {
                    to: selectedUser.socketId,
                    candidate: event.candidate,
                });
            };

            const offer = await peer.createOffer();

            await peer.setLocalDescription(offer);
            setCallStatus(`Calling ${selectedUser.name}...`);
            setIsCalling(true);
            socket.emit('callUser', {
                callerId: currentUser.id,
                callerName: currentUser.name,
                receiverSocketId: selectedUser.socketId,
                offer,
                callType: type,
                chatId,
            });
        } catch (error) {
            console.error(error);

            alert(
                'Unable to access camera. Please check camera permissions or close other applications using the camera.'
            );

            return;
        }

    };
    const answerCall = async () => {


        peerRef.current?.close();
        peerRef.current = null;
        try {
            console.log('REQUESTING CAMERA...');
            const stream =
                await getMediaStream(incomingCall.callType);
            console.log(
                "ANSWER VIDEO TRACKS:",
                stream.getVideoTracks().length
            );

            console.log(
                "ANSWER AUDIO TRACKS:",
                stream.getAudioTracks().length
            );
            console.log('CAMERA SUCCESS');

            setLocalStream(stream);

            if (
                incomingCall.callType === 'video' &&
                localVideoRef.current
            ) {
                localVideoRef.current.srcObject =
                    stream;
            }

            const peer = createPeer();

            peerRef.current = peer;

            stream.getTracks().forEach((track) => {
                peer.addTrack(track, stream);
            });

            peer.onicecandidate = (event) => {
                if (!event.candidate) return;
                socket.emit('iceCandidate', {
                    to: incomingCall.callerSocketId,
                    candidate: event.candidate,
                });
            };
            await peer.setRemoteDescription(
                new RTCSessionDescription(
                    incomingCall.offer,
                ),
            );
            for (const candidate of pendingCandidates.current) {
                await peer.addIceCandidate(
                    candidate ? new RTCIceCandidate(candidate) : null
                );
            }

            pendingCandidates.current = [];

            const answer =
                await peer.createAnswer();

            await peer.setLocalDescription(
                answer,
            );

            socket.emit('answerCall', {
                callerSocketId:
                    incomingCall.callerSocketId,
                answer,
            });
            clearTimeout(missedCallTimer.current);
            setIncomingCall(null);
        } catch (err: any) {
            console.error('CAMERA ERROR');
            console.error(err);
            console.error('NAME:', err.name);
            console.error('MESSAGE:', err.message);

            alert(
                `Camera Error:
${err.name}
${err.message}`
            );

            return;
        }
    };

    const endCall = () => {

        peerRef.current?.close();
        peerRef.current = null;
        pendingCandidates.current = [];
        setRemoteStream(null);
        remoteStreamRef.current = null;
        localStream?.getTracks().forEach(
            track => track.stop(),
        );
        if (localVideoRef.current)
            localVideoRef.current.srcObject = null;

        if (remoteVideoRef.current)
            remoteVideoRef.current.srcObject = null;
        const duration = callStartTime
            ? Math.floor(
                (Date.now() - callStartTime) / 1000
            )
            : 0;
        socket.emit('endCall', {
            to: selectedUser?.socketId,
            chatId: chatId,
            userId: currentUser.id,
            duration: duration,
            callType: currentCallType,
        });

        setIsCalling(false);
        setCallConnected(false);
        setCallStatus('Call Ended');

        setTimeout(() => {
            loadMessages(chatId);
        }, 500);
        setTimeout(() => {
            setCallStatus('');
        }, 2000);
    };
    const formatDuration = (
        seconds: number = 0,
    ) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;

        return `${mins}:${secs
            .toString()
            .padStart(2, '0')}`;
    };

    const startRecording = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
        });

        recordingStreamRef.current = stream;
        recordingChunksRef.current = [];

        const recorder = new MediaRecorder(stream);
        recorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                recordingChunksRef.current.push(e.data);
            }
        };

        recorder.onstop = async () => {
            const blob = new Blob(recordingChunksRef.current, {
                type: 'audio/webm',
            });

            const file = new File([blob], 'voice-note.webm', {
                type: 'audio/webm',
            });

            await uploadFile(file);

            recordingStreamRef.current
                ?.getTracks()
                .forEach((track) => track.stop());

            recordingStreamRef.current = null;
            recorderRef.current = null;
            recordingChunksRef.current = [];
            setIsRecording(false);
        };

        recorder.start();
        setIsRecording(true);
    };

    const stopRecording = () => {
        if (
            recorderRef.current &&
            recorderRef.current.state !== 'inactive'
        ) {
            recorderRef.current.stop();
        }
    };


    const typingTimeout =
        useRef<any>(null);
    return (
        <>
            <audio
                ref={remoteAudioRef}
                autoPlay
            />
            {incomingCall && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 md:p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="flex flex-col items-center text-center">
                            <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center text-4xl md:text-5xl shadow-lg mb-4 ${
                                incomingCall.callType === 'video'
                                    ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                                    : 'bg-gradient-to-br from-green-500 to-green-600'
                            }`}>
                                {incomingCall.callType === 'video' ? '📹' : '📞'}
                            </div>
                            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                                Incoming {incomingCall.callType === 'video' ? 'Video' : 'Audio'} Call
                            </h2>
                            <p className="text-gray-600 text-base md:text-lg mb-6">
                                {incomingCall.callerName}
                            </p>

                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={answerCall}
                                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-3 md:py-4 font-semibold transition-all shadow-md hover:shadow-lg"
                                >
                                    <span className="text-xl">✓</span>
                                    <span>Accept</span>
                                </button>

                                <button
                                    onClick={() => {
                                        peerRef.current?.close();
                                        peerRef.current = null;

                                        localStream?.getTracks().forEach((track) => track.stop());

                                        setIncomingCall(null);
                                        setIsCalling(false);
                                        setCallConnected(false);
                                        clearTimeout(missedCallTimer.current);
                                        socket.emit('rejectCall', {
                                            to: incomingCall.callerSocketId,
                                            chatId: incomingCall.chatId,
                                            userId: currentUser.id,
                                            callType: incomingCall.callType,
                                        });

                                        setCallStatus('Call Rejected');
                                    }}
                                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-3 md:py-4 font-semibold transition-all shadow-md hover:shadow-lg"
                                >
                                    <span className="text-xl">✕</span>
                                    <span>Reject</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex h-screen bg-gray-100 overflow-hidden">

                {/* Sidebar */}
                <div
                    className={`
    bg-white border-r border-gray-200
    w-full md:w-80
    ${showUsers ? 'block' : 'hidden'}
    md:block
    flex flex-col
    shadow-sm
  `}
                >

                    <div className="border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 p-4 md:p-5">
                        <h1 className="text-2xl md:text-3xl text-white font-bold tracking-tight">
                            Messages
                        </h1>
                        <p className="text-blue-100 text-sm mt-1">
                            Connect with your team
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {users.map((user) => (
                            <div
                                key={user._id}
                                onClick={() => startChat(user)}
                                className={` cursor-pointer
    border-b border-gray-100
    p-4 md:p-5
    hover:bg-blue-50
    active:bg-blue-100
    transition-all duration-200 ${selectedUser?._id === user._id
                                        ? 'bg-blue-50 border-l-4 border-l-blue-600'
                                        : 'border-l-4 border-l-transparent'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="relative flex-shrink-0">
                                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-md">
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className={`absolute bottom-0 right-0 w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-white ${user.isOnline
                                                ? 'bg-green-500'
                                                : 'bg-gray-400'
                                            }`} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-gray-900 text-base md:text-lg truncate">
                                            {user.name}
                                        </h3>

                                        <p className="text-sm text-gray-500 truncate">
                                            {user.email}
                                        </p>

                                        <span
                                            className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${user.isOnline
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-gray-100 text-gray-600'
                                                }`}
                                        >
                                            {user.isOnline ? 'Online' : 'Offline'}
                                        </span>
                                    </div>

                                </div>
                            </div>
                        ))}
                    </div>

                </div>

                {/* Chat Area */}
                <div
                    className={`
    flex flex-1 flex-col
    ${showUsers ? 'hidden' : 'flex'}
    md:flex
  `}
                >

                    {!selectedUser ? (
                        <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                            <div className="text-center p-8">
                                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-4xl shadow-lg">
                                    💬
                                </div>
                                <h2 className="text-2xl md:text-3xl text-gray-700 font-semibold mb-2">
                                    Start a Conversation
                                </h2>
                                <p className="text-gray-500 text-base md:text-lg">
                                    Select a user from the sidebar to begin chatting
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="border-b border-gray-200 bg-white p-2 md:p-4 shadow-sm">
                                <div className="flex items-center justify-between gap-2">

                                    <div className="flex items-center gap-2 flex-1 min-w-0 max-w-fit">
                                        <button
                                            onClick={() => setShowUsers(true)}
                                            className="md:hidden flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600 flex-shrink-0"
                                        >
                                            ←
                                        </button>
                                        <div className="relative flex-shrink-0">
                                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-base md:text-lg shadow-md">
                                                {selectedUser.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 md:w-3 md:h-3 rounded-full border-2 border-white ${selectedUser.isOnline
                                                    ? 'bg-green-500'
                                                    : 'bg-gray-400'
                                                }`} />
                                        </div>
                                        <div className="flex-1 min-w-0 max-w-fit">
                                            <h2 className="font-bold text-gray-900 text-sm md:text-lg truncate">
                                                {selectedUser.name}
                                            </h2>

                                            <p className="text-xs md:text-sm text-black truncate hidden sm:block">
                                                {selectedUser.email}    
                                            </p>


                                            {typingUser && (
                                                <p className="text-xs text-green-600 font-medium mt-0.5">
                                                    {typingUser}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 md:gap-2 flex-shrink-0 max-w-fit mr-6">
                                        {callConnected && (
                                            <div className="hidden sm:flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full">
                                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                                <span className="text-green-700 text-sm font-medium">
                                                    {formatDuration(callDuration)}
                                                </span>
                                            </div>
                                        )}
                                        {!isCalling && !callConnected && (
                                            <button
                                                onClick={() => callUser('audio')}
                                                className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 md:w-auto md:px-4 md:py-2 rounded-full md:rounded-lg bg-green-500 hover:bg-green-600 text-white transition-all shadow-md hover:shadow-lg flex-shrink-0"
                                                title="Audio Call"
                                            >
                                                <span className="md:hidden text-sm">📞</span>
                                                <span className="hidden md:inline text-sm font-medium">Audio</span>
                                            </button>
                                        )}
                                        {!isCalling && !callConnected && (
                                            <button
                                                onClick={() => callUser('video')}
                                                className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 md:w-auto md:px-4 md:py-2 rounded-full md:rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-all shadow-md hover:shadow-lg flex-shrink-0"
                                                title="Video Call"
                                            >
                                                <span className="md:hidden text-sm">📹</span>
                                                <span className="hidden md:inline text-sm font-medium">Video</span>
                                            </button>
                                        )}
                                        {isCalling && !callConnected && (
                                            <button
                                                disabled
                                                className="
      sm:w-auto
      rounded-lg
      bg-yellow-500
      px-4
      py-2.5
      text-white
      font-medium
      cursor-not-allowed
      opacity-80
    "
                                            >
                                                <span className="md:hidden text-sm">📞</span>
                                                <span className="hidden md:inline text-sm font-medium">Calling...</span>
                                            </button>
                                        )}

                                        {callConnected && (
                                            <button
                                                onClick={endCall}
                                                className="
      sm:w-auto
      rounded-lg
      bg-red-600
      px-4
      py-2.5
      text-white
      font-medium
      hover:bg-red-700
      transition
    "
                                            >
                                                <span className="md:hidden">🔴</span>
                                                <span className="hidden md:inline text-sm font-medium">End</span>
                                            </button>
                                        )}

                                    </div>

                                </div>
                            </div>
                            {callStatus && (
                                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 p-2 md:p-3 text-center text-blue-700 font-medium text-sm md:text-base">
                                    {callStatus}
                                </div>
                            )}
                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-4 space-y-4 bg-gray-50  pr-6">

                                {messages.map((msg, index) => {
                                    const isMine =
                                        msg.senderId === currentUser.id;

                                    return (
                                        <div
                                            key={msg._id || index}
                                            className={`flex ${isMine
                                                ? 'justify-end'
                                                : 'justify-start'
                                                }`}
                                        >

                                            {msg.type === 'text' && (
                                                <div
                                                    className={`max-w-[80%] md:max-w-[70%]
      rounded-2xl px-4 py-2.5 md:px-5 md:py-3 shadow-md
      ${isMine
                                                            ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                                                            : 'bg-white text-gray-900 border border-gray-200'
                                                        }`}
                                                >
                                                    <div className="text-sm md:text-base leading-relaxed break-words">{msg.text}</div>

                                                    <div
                                                        className={`mt-2 flex items-center justify-end gap-1 text-[10px] md:text-xs opacity-70 ${isMine ? 'text-blue-100' : 'text-gray-500'
                                                            }`}
                                                    >
                                                        {new Date(msg.createdAt || '').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                        {isMine && (
                                                            <span className="ml-1">
                                                                {msg.status === 'sent' && '✓'}
                                                                {msg.status === 'delivered' && '✓✓'}
                                                                {msg.status === 'seen' && (
                                                                    <span className="text-blue-300">
                                                                        ✓✓
                                                                    </span>
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            {msg.type?.startsWith('image/') && (
                                                <div className="max-w-[80%] md:max-w-xs rounded-2xl overflow-hidden shadow-lg border border-gray-200">
                                                    <img
                                                        src={msg.fileUrl}
                                                        alt="image"
                                                        className="w-full h-auto"
                                                    />
                                                    <div className="bg-white px-3 py-2 text-xs text-gray-500">
                                                        {new Date(msg.createdAt || '').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                    </div>
                                                </div>
                                            )}
                                            {msg.type?.startsWith('audio/') && (
                                                <div
                                                    className={`max-w-[80%] md:max-w-xs rounded-2xl p-4 shadow-md ${
                                                        isMine
                                                            ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                                                            : 'bg-white border border-gray-200'
                                                    }`}
                                                >
                                                    <div className={`mb-3 text-sm font-medium ${isMine ? 'text-blue-100' : 'text-gray-700'}`}>
                                                        🎤 Voice Message
                                                    </div>

                                                    <audio
                                                        controls
                                                        src={msg.fileUrl}
                                                        className="w-full"
                                                    />
                                                    <div className={`mt-2 text-xs ${isMine ? 'text-blue-200' : 'text-gray-500'}`}>
                                                        {new Date(msg.createdAt || '').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                    </div>
                                                </div>
                                            )}
                                            {msg.type === 'application/pdf' && (
                                                <div className="max-w-[80%] md:max-w-xs rounded-2xl bg-white border border-gray-200 p-4 shadow-md">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-red-600 text-xl">
                                                            📄
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-gray-900 text-sm">
                                                                PDF Document
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {new Date(msg.createdAt || '').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <a
                                                        href={msg.fileUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                                    >
                                                        Open PDF
                                                    </a>
                                                </div>
                                            )}

                                            {/* Video */}
                                            {msg.type?.startsWith('video/') && (
                                                <div className="max-w-[80%] md:max-w-xs rounded-2xl overflow-hidden shadow-lg border border-gray-200">
                                                    <video
                                                        controls
                                                        className="w-full h-auto"
                                                    >
                                                        <source src={msg.fileUrl} />
                                                    </video>
                                                    <div className="bg-white px-3 py-2 text-xs text-gray-500">
                                                        {new Date(msg.createdAt || '').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                    </div>
                                                </div>
                                            )}
                                            {msg.type === 'audio-call-start' && (
                                                <div className="flex justify-center">
                                                    <div className="bg-green-50 border border-green-200 rounded-full px-4 py-2 text-green-700 text-sm font-medium">
                                                        📞 Audio Call Started
                                                    </div>
                                                </div>
                                            )}

                                            {msg.type === 'audio-call-end' && (
                                                <div className="flex justify-center">
                                                    <div className="bg-red-50 border border-red-200 rounded-full px-4 py-2 text-red-700 text-sm font-medium">
                                                        📞 Audio Call Ended • {formatDuration(msg.duration)}
                                                    </div>
                                                </div>
                                            )}
                                            {msg.type === 'audio-call-missed' && (
                                                <div className="flex justify-center">
                                                    <div className="bg-orange-50 border border-orange-200 rounded-full px-4 py-2 text-orange-700 text-sm font-medium">
                                                        📵 Missed Audio Call
                                                    </div>
                                                </div>
                                            )}
                                            {msg.type === 'audio-call-rejected' && (
                                                <div className="flex justify-center">
                                                    <div className="bg-orange-50 border border-orange-200 rounded-full px-4 py-2 text-orange-700 text-sm font-medium">
                                                        📵 Audio Call Rejected
                                                    </div>
                                                </div>
                                            )}
                                            {msg.type === 'video-call-rejected' && (
                                                <div className="flex justify-center">
                                                    <div className="bg-orange-50 border border-orange-200 rounded-full px-4 py-2 text-orange-700 text-sm font-medium">
                                                        📵 Video Call Rejected
                                                    </div>
                                                </div>
                                            )}
                                            {msg.type === 'video-call-missed' && (
                                                <div className="flex justify-center">
                                                    <div className="bg-orange-50 border border-orange-200 rounded-full px-4 py-2 text-orange-700 text-sm font-medium">
                                                        📵 Missed Video Call
                                                    </div>
                                                </div>
                                            )}
                                            {msg.type === 'video-call-start' && (
                                                <div className="flex justify-center">
                                                    <div className="bg-green-50 border border-green-200 rounded-full px-4 py-2 text-green-700 text-sm font-medium">
                                                        🎥 Video Call Started
                                                    </div>
                                                </div>
                                            )}

                                            {msg.type === 'video-call-end' && (
                                                <div className="flex justify-center">
                                                    <div className="bg-red-50 border border-red-200 rounded-full px-4 py-2 text-red-700 text-sm font-medium">
                                                        🎥 Video Call Ended • {formatDuration(msg.duration)}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Other Files */}
                                            {msg.fileUrl &&
                                                !msg.type?.startsWith('image/') &&
                                                !msg.type?.startsWith('video/') &&
                                                !msg.type?.startsWith('audio/') &&
                                                msg.type !== 'application/pdf' && (
                                                    <div className="max-w-[80%] md:max-w-xs rounded-2xl bg-white border border-gray-200 p-4 shadow-md">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 text-xl">
                                                                📎
                                                            </div>
                                                            <a
                                                                href={msg.fileUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex-1 text-blue-600 hover:text-blue-700 text-sm font-medium underline"
                                                            >
                                                                Download File
                                                            </a>
                                                        </div>
                                                    </div>
                                                )}
                                        </div>
                                    );
                                })}

                            </div>
                            {currentCallType === 'video' && callConnected && (
                                <div className="fixed inset-0 z-50 bg-black">
                                    <video
                                        ref={remoteVideoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="h-full w-full object-cover"
                                        onLoadedMetadata={() =>
                                            console.log("REMOTE VIDEO LOADED")
                                        }
                                        onCanPlay={() =>
                                            console.log("REMOTE VIDEO CANPLAY")
                                        }
                                        onPlaying={() =>
                                            console.log("REMOTE VIDEO PLAYING")
                                        }
                                        onError={(e) =>
                                            console.log("VIDEO ERROR", e)
                                        }

                                    />

                                    <video
                                        ref={localVideoRef}
                                        autoPlay
                                        muted
                                        playsInline
                                        className="absolute bottom-20 right-4 md:bottom-4 md:right-4 w-24 h-32 md:w-48 md:h-36 rounded-xl bg-black border-2 border-white/30 shadow-2xl object-cover"
                                        onLoadedMetadata={() =>
                                            console.log("LOCAL VIDEO LOADED")
                                        }
                                    />

                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
                                        <div className="bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm font-medium">
                                            {formatDuration(callDuration)}
                                        </div>
                                        <button
                                            onClick={endCall}
                                            className="flex items-center justify-center w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold transition-all shadow-lg hover:shadow-xl"
                                        >
                                            <span className="text-2xl">🔴</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Input */}
                            <div className="border-t border-gray-200 bg-white p-2 md:p-4 shadow-sm">

                                <div className="flex items-center gap-1 md:gap-3">
  <input
    value={text}
    onChange={(e) => {
      setText(e.target.value);

      socket.emit("typing", {
        chatId,
        userId: currentUser.id,
        name: currentUser.name,
      });

      clearTimeout(typingTimeout.current);

      typingTimeout.current = setTimeout(() => {
        socket.emit("stopTyping", {
          chatId,
          userId: currentUser.id,
        });
      }, 1000);
    }}
    onKeyDown={(e) => {
      if (e.key === "Enter" && text.trim()) {
        sendMessage();
      }
    }}
    placeholder="Type a message..."
    className="flex-1 rounded-xl border border-gray-300 pl-3 py-2.5 md:py-3 text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
  />

  {isRecording ? (
    <button
      onClick={stopRecording}
      className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 md:w-auto md:px-4 md:py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white transition-all shadow-md hover:shadow-lg animate-pulse flex-shrink-0"
      title="Stop Recording"
    >
      <span className="md:hidden text-sm">⏹</span>
      <span className="hidden md:inline">Stop</span>
    </button>
  ) : text.trim() ? (
    <button
      onClick={sendMessage}
      className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 md:w-auto md:px-6 md:py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium transition-all shadow-md hover:shadow-lg flex-shrink-0"
    >
      <span className="text-sm">➤</span>
      
    </button>
  ) : (
    <button
      onClick={startRecording}
      className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 md:w-auto md:px-4 md:py-3 rounded-xl bg-gray-700 hover:bg-gray-800 text-white transition-all shadow-md hover:shadow-lg flex-shrink-0"
      title="Start Recording"
    >
      <span className="md:hidden text-sm">🎤</span>
      <span className="hidden md:inline">Record</span>
    </button>
  )}
</div>
                                <div ref={messagesEndRef} />
                                <div className="mt-3 flex items-center gap-2">
                                    <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-gray-700 text-sm">
                                        <span>📎</span>
                                        <span className="hidden md:inline">Attach File</span>
                                        <input
                                            type="file"
                                            multiple
                                            accept="*/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const files = Array.from(e.target.files || []);
                                                files.forEach(uploadFile);
                                            }}
                                        />
                                    </label>
                                </div>

                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}