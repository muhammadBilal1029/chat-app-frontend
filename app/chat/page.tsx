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
}

export default function ChatPage() {
    const peerRef = useRef<RTCPeerConnection | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [showUsers, setShowUsers] =
  useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [chatId, setChatId] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
const [incomingCall, setIncomingCall] = useState<any>(null);
const [isCalling, setIsCalling] = useState(false);
const [callStatus, setCallStatus] = useState('');
const [callStartTime, setCallStartTime] =
  useState<number | null>(null);
const [callConnected, setCallConnected] =
  useState(false);
const [localStream, setLocalStream] =

  useState<MediaStream | null>(null);
  const currentUser =
    typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('user') || '{}')
      : {};

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
       console.log('INCOMING CALL EVENT');
  console.log(data);

     
      setIncomingCall(data);
    });
    socket.on('callAccepted', async (data) => {

  setCallStatus('Call Connected');
 setCallStartTime(Date.now());
  if (!peerRef.current) return;

  await peerRef.current.setRemoteDescription(
    new RTCSessionDescription(data.answer),
  );
});
socket.on(
  'iceCandidate',
  async (candidate) => {

    console.log(
      'ICE RECEIVED',
      candidate,
    );

    if (!peerRef.current) return;

    await peerRef.current.addIceCandidate(
      new RTCIceCandidate(candidate),
    );
  },
);

socket.on('userStatusChanged', () => {
  loadUsers();
});
 socket.on('callEnded', () => {

  setCallConnected(false);

  setCallStatus('Call Ended');

  peerRef.current?.close();

  localStream?.getTracks().forEach(
    track => track.stop(),
  );

   setTimeout(() => {
    loadMessages(chatId);
  }, 500);
});
    socket.on('newMessage', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.off('newMessage');
    };
  }, []);

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
    ],
  });

  peer.ontrack = (event) => {
    console.log('Remote stream received');

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
    loadMessages(chatId);
  };
const callUser = async () => {
  if (!selectedUser?.socketId) {
    alert('User offline');
    return;
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
  });

  setLocalStream(stream);

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
  });
};
const answerCall = async () => {

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
  });

  setLocalStream(stream);

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

  setIncomingCall(null);
};

const endCall = () => {

  peerRef.current?.close();

  localStream?.getTracks().forEach(
    track => track.stop(),
  );
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
  });

  setIsCalling(false);
  setCallConnected(false);
  setCallStatus('Call Ended');

   setTimeout(() => {
    loadMessages(chatId);
  }, 500);
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
              onClick={() => setIncomingCall(null)}
              className="flex-1 rounded bg-red-600 px-4 py-3 text-white font-medium"
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
    active:bg-gray-200 ${
                selectedUser?._id === user._id
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
                  {callStatus && (
                    <p className="text-sm text-blue-600 mt-1">
                      {callStatus}
                    </p>
                  )}
                </div>

               <div className="flex flex-wrap justify-end gap-2 sm:gap-3 flex-shrink-0">

  {!isCalling && !callConnected && (
  <button
    onClick={callUser}
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
    📞 Call
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
                    className={`flex ${
                      isMine
                        ? 'justify-end'
                        : 'justify-start'
                    }`}
                  > {msg.type === 'text' && (
                    <div className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-4 py-2 md:px-5 md:py-3 text-black ${
                      isMine
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border shadow-sm'
                    }`}>{msg.text}</div>
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

{msg.type === 'application/pdf' && (
  <div className="max-w-[80%] md:max-w-xs rounded-lg border bg-white p-3 shadow-sm">
    <div className="font-medium text-red-600 text-sm">
      📄 PDF Document
    </div>

    <a
      href={msg.fileUrl}
      target="_blank"
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

{/* Other Files */}
{msg.fileUrl &&
 !msg.type?.startsWith('image/') &&
 !msg.type?.startsWith('video/') &&
 msg.type !== 'application/pdf' && (
  <a
    href={msg.fileUrl}
    target="_blank"
    className="underline text-black text-sm"
  >
    📎 Download File
  </a>
)}
                  </div>
                );
              })}

            </div>

            {/* Input */}
            <div className="border-t bg-white p-3 md:p-4">

             <div className="flex flex-col md:flex-row gap-2">

                <input
                  value={text}
                  onChange={(e) =>
                    setText(e.target.value)
                  }
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

              </div>

              <input
                type="file"
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