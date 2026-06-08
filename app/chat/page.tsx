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
    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
    const currentUser =
        typeof window !== 'undefined'
            ? JSON.parse(localStorage.getItem('user') || '{}')
            : {};
    const [typingUser, setTypingUser] = useState('');
    const [callType, setCallType] = useState<'audio' | 'video'>('audio');
    const [currentCallType,
        setCurrentCallType] =
        useState<'audio' | 'video'>('audio');
    const missedCallTimer =
        useRef<any>(null);
        const recorderRef = useRef<MediaRecorder | null>(null);
const recordingStreamRef = useRef<MediaStream | null>(null);
const recordingChunksRef = useRef<Blob[]>([]);
const [isRecording, setIsRecording] = useState(false);
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
            setCurrentCallType(
                data.callType,
            );
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
        });
        socket.on('iceCandidate', async (candidate) => {
            try {
                if (!peerRef.current) return;

                if (
                    peerRef.current.connectionState === 'closed' ||
                    peerRef.current.signalingState === 'closed'
                ) {
                    return;
                }

                await peerRef.current.addIceCandidate(
                    new RTCIceCandidate(candidate),
                );
            } catch (error) {
                console.log('ICE candidate ignored:', error);
            }
        });

        socket.on('userStatusChanged', () => {
            loadUsers();
        });
        socket.on('callEnded', () => {

            setCallConnected(false);
            setCallDuration(0);
            setCallStartTime(null);
            setCallStatus('Call Ended');

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
    iceServers: [
      {
        urls: 'stun:stun.l.google.com:19302',
      },
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
    ],
  });

        peer.ontrack = (event) => {
            console.log('Remote stream received');
            if (
                currentCallType === 'video' &&
                remoteVideoRef.current
            ) {
                remoteVideoRef.current.srcObject =
                    event.streams[0];
            }
            if (remoteAudioRef.current) {
                remoteAudioRef.current.srcObject =
                    event.streams[0];
            }
        };

        peer.oniceconnectionstatechange = () => {
            console.log(
                'ICE STATE:',
                peer.iceConnectionState,
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
        console.log("selectedUser",selectedUser)
        if (!selectedUser?.socketId) {
            alert('User offline');
            return;
        }

        try {
 const stream = await getMediaStream(type);

  setLocalStream(stream);
if (
            type === 'video' &&
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
            if (event.candidate) {

                console.log(
                    'SENDING CALLER ICE'
                );

                socket.emit('iceCandidate', {
                    to: selectedUser.socketId,
                    candidate: event.candidate,
                });
            }
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

        try {
            console.log('REQUESTING CAMERA...');
  const stream =
  await getMediaStream(incomingCall.callType);
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
            if (event.candidate) {

                console.log(
                    'SENDING RECEIVER ICE'
                );

                socket.emit('iceCandidate', {
                    to: incomingCall.callerSocketId,
                    candidate: event.candidate,
                });
            }
        };
        await peer.setRemoteDescription(
            new RTCSessionDescription(
                incomingCall.offer,
            ),
        );

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
        } catch (err:any) {
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">
                        <h2 className="font-bold text-black text-lg">
                            Incoming Call
                        </h2>
                        <p>
                            {incomingCall.callType === 'video'
                                ? '📹 Video Call'
                                : '📞 Audio Call'}
                        </p>
                        <p className="text-black text-base mt-2">
                            {incomingCall.callerName}
                        </p>

                        <div className="mt-4 flex gap-3">
                            <button
                                onClick={answerCall}
                                className="flex-1 rounded bg-green-600 px-4 py-3 text-white font-medium"
                            >
                                Accept
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
                                className="rounded bg-red-600 px-4 py-2 text-white"
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex h-screen bg-gray-100 overflow-hidden">

                {/* Sidebar */}
                <div
                    className={`
    bg-white border-r
    w-full md:w-80
    ${showUsers ? 'block' : 'hidden'}
    md:block
  `}
                >

                    <div className="border-b p-4">
                        <h1 className="text-2xl text-black font-bold">
                            Chats
                        </h1>
                    </div>

                    <div>
                        {users.map((user) => (
                            <div
                                key={user._id}
                                onClick={() => startChat(user)}
                                className={` cursor-pointer
    border-b
    p-4
    hover:bg-gray-100
    active:bg-gray-200 ${selectedUser?._id === user._id
                                        ? 'bg-gray-100'
                                        : ''
                                    }`}
                            >
                                <div className="flex items-center justify-between">

                                    <div>
                                        <h3 className="font-semibold text-black">
                                            {user.name}
                                        </h3>

                                        <p className="text-sm text-gray-500 ">
                                            {user.email}
                                        </p>

                                    </div>

                                    <span
                                        className={
                                            user.isOnline
                                                ? 'text-green-500'
                                                : 'text-gray-400'
                                        }
                                    >
                                        {user.isOnline
                                            ? 'Online'
                                            : 'Offline'}
                                    </span>

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
                        <div className="flex flex-1 items-center justify-center">
                            <h2 className="text-2xl text-gray-400">
                                Select a user to start chatting
                            </h2>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="border-b bg-white p-3 md:p-4">
                                <div className="flex items-start justify-between gap-3">

                                    <div className="flex-1 min-w-0">
                                        <button
                                            onClick={() => setShowUsers(true)}
                                            className="md:hidden text-blue-600 font-medium mb-2 flex items-center gap-1 mr-auto"
                                        >
                                            ← Back
                                        </button>
                                        <h2 className="font-bold text-black text-lg md:text-xl truncate">
                                            {selectedUser.name}
                                        </h2>

                                        <p className="text-sm text-gray-500 text-black truncate">
                                            {selectedUser.email}
                                        </p>


                                        {typingUser && (
                                            <p className="text-sm text-green-600">
                                                {typingUser}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap justify-end gap-2 sm:gap-3 flex-shrink-0">
                                        {callConnected && (
                                            <p className="text-green-600 text-sm">
                                                Connected • {formatDuration(callDuration)}
                                            </p>
                                        )}
                                        {!isCalling && !callConnected && (
                                            <button
                                                onClick={() => callUser('audio')}
                                                className="
      sm:w-auto
      rounded-lg
  bg-green-600
  px-4
  py-2.5
  text-sm
  text-white
  font-medium
  hover:bg-green-700
  transition
  sm:text-base
    "
                                            >
                                                📞 Audio Call
                                            </button>
                                        )}
                                        {!isCalling && !callConnected && (
                                            <button
                                                onClick={() => callUser('video')}
                                                className="
      sm:w-auto
      rounded-lg
  bg-green-600
  px-4
  py-2.5
  text-sm
  text-white
  font-medium
  hover:bg-green-700
  transition
  sm:text-base
    "
                                            >
                                                📞 Video Call
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
                                                📞 Calling...
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
                                                🔴 End Call
                                            </button>
                                        )}

                                    </div>

                                </div>
                            </div>
                            {callStatus && (
                                <div className="bg-blue-100 border-b p-2 md:p-3 text-center text-blue-700 font-medium text-sm md:text-base">
                                    {callStatus}
                                </div>
                            )}
                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3">

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
      rounded-2xl px-4 py-2 md:px-5 md:py-3
      ${isMine
        ? 'bg-blue-600 text-white'
        : 'bg-white text-black border shadow-sm'
      }`}
  >
    <div>{msg.text}</div>

    <div
      className={`mt-1 text-center text-[10px] opacity-70 ${
        isMine ? 'text-white' : 'text-gray-500'
      }`}
    >
      {new Date(msg.createdAt || '').toLocaleTimeString()}
    </div>

    {isMine && (
      <div className="text-right text-xs mt-1">
        {msg.status === 'sent' && '✓'}

{msg.status === 'delivered' && '✓✓'}

{msg.status === 'seen' && (
  <span className="text-blue-400">
    ✓✓
  </span>
)}
      </div>
    )}
  </div>
)}
                                            {msg.type?.startsWith('image/') && (
                                                <img
                                                    src={msg.fileUrl}
                                                    alt="image"
                                                    className="
      max-w-[80%]
      md:max-w-xs
      rounded-lg
    "
                                                />
                                            )}
                                            {msg.type?.startsWith('audio/') && (
  <div
    className={`
      rounded-2xl p-3
      ${isMine
        ? 'bg-blue-600'
        : 'bg-white border'}
    `}
  >
    <div className="mb-2 text-sm text-black">
      🎤 Voice Message
    </div>

    <audio
      controls
      src={msg.fileUrl}
      className="w-full"
    />
  </div>
)}
                                            {msg.type === 'application/pdf' && (
                                                <div className="max-w-[80%] md:max-w-xs rounded-lg border bg-white p-3 shadow-sm">
                                                    <div className="font-medium text-red-600 text-sm">
                                                        📄 PDF Document
                                                    </div>

                                                    <a
                                                        href={msg.fileUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 underline text-sm"
                                                    >
                                                        Open PDF
                                                    </a>
                                                </div>
                                            )}

                                            {/* Video */}
                                            {msg.type?.startsWith('video/') && (
                                                <video
                                                    controls
                                                    className="max-w-[80%] md:max-w-xs rounded-lg"
                                                >
                                                    <source src={msg.fileUrl} />
                                                </video>
                                            )}
                                            {msg.type === 'audio-call-start' && (
                                                <div className="text-center text-green-600 text-sm">
                                                    📞 Call Started
                                                </div>
                                            )}

                                            {msg.type === 'audio-call-end' && (
                                                <div className="text-center text-red-600 text-sm">
                                                    📞 Call Ended
                                                    <br />
                                                    Duration: {formatDuration(msg.duration)}
                                                </div>
                                            )}
                                            {msg.type === 'audio-call-missed' && (
                                                <div className="text-center text-orange-500">
                                                    📵 Missed Call
                                                </div>
                                            )}
                                            {msg.type === 'audio-call-rejected' && (
                                                <div className="text-center text-orange-500">
                                                    📵 audio call rejected
                                                </div>
                                            )}
                                            {msg.type === 'video-call-rejected' && (
                                                <div className="text-center text-orange-500">
                                                    📵 Video Call Rejected
                                                </div>
                                            )}
                                            {msg.type === 'video-call-missed' && (
                                                <div className="text-center text-orange-500">
                                                    📵 Missed Video Call
                                                </div>
                                            )}
                                            {msg.type === 'video-call-start' && (
                                                <div className="text-center text-green-600 text-sm">
                                                    🎥 Video Call Started
                                                </div>
                                            )}

                                            {msg.type === 'video-call-end' && (
                                                <div className="text-center text-red-600 text-sm">
                                                    🎥 Video Call Ended
                                                    <br />
                                                    Duration: {formatDuration(msg.duration)}
                                                </div>
                                            )}

                                            {/* Other Files */}
                                            {msg.fileUrl &&
 !msg.type?.startsWith('image/') &&
 !msg.type?.startsWith('video/') &&
 !msg.type?.startsWith('audio/') &&
 msg.type !== 'application/pdf' && (
  <a
    href={msg.fileUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="underline text-black text-sm"
  >
    📎 Download File
  </a>
)}
                                        </div>
                                    );
                                })}

                            </div>
                            {currentCallType === 'video' && callConnected && (
                                <div className="fixed inset-0 z-50 bg-black p-4">
                                    <video
                                        ref={remoteVideoRef}
                                        autoPlay
                                        playsInline
                                        className="h-full w-full object-cover"
                                    />

                                    <video
                                        ref={localVideoRef}
                                        autoPlay
                                        muted
                                        playsInline
                                        className="absolute bottom-4 right-4 h-32 w-24 rounded bg-black"
                                    />

                                    <button
                                        onClick={endCall}
                                        className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-red-600 px-6 py-3 text-white"
                                    >
                                        End
                                    </button>
                                </div>
                            )}

                            {/* Input */}
                            <div className="border-t bg-white p-3 md:p-4">

                                <div className="flex flex-col md:flex-row gap-2">

                                    <input
                                        value={text}
                                        onChange={(e) => {
                                            setText(e.target.value);

                                            socket.emit('typing', {
                                                chatId,
                                                userId: currentUser.id,
                                                name: currentUser.name,
                                            });
                                            clearTimeout(
                                                typingTimeout.current,
                                            );

                                            typingTimeout.current = setTimeout(() => {
                                                socket.emit('stopTyping', {
                                                    chatId,
                                                    userId: currentUser.id,
                                                });
                                            }, 1000);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                sendMessage();
                                            }
                                        }}
                                        placeholder="Type a message..."
                                        className="
    w-full
    md:flex-1
    rounded-lg
    border
    p-3
    text-black
    text-base
  "
                                    />

                                    <button
                                        onClick={sendMessage}
                                        className="
  w-full
  md:w-auto
  rounded-lg
  bg-blue-600
  px-6
  py-3
  text-white
  font-medium
"
                                    >
                                        Send
                                    </button>
                                    {!isRecording ? (
  <button
    onClick={startRecording}
    className="rounded-lg bg-gray-700 px-4 py-3 text-white"
  >
    🎤 Start
  </button>
) : (
  <button
    onClick={stopRecording}
    className="rounded-lg bg-red-600 px-4 py-3 text-white"
  >
    ⏹ Stop
  </button>
)}
                                </div>
                                <div ref={messagesEndRef} />
                                <input
                                    type="file"
                                    accept="
    image/*,
    video/*,
    application/pdf
  "
                                    className="mt-3 text-black text-sm"
                                    onChange={(e) => {
                                        const file =
                                            e.target.files?.[0];

                                        if (file) {
                                            uploadFile(file);
                                        }
                                    }}
                                />

                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}