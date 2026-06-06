'use client';

import { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import { socket } from '@/lib/socket';

export default function CallPage() {
  const myVideo = useRef<HTMLVideoElement>(null);
  const userVideo = useRef<HTMLVideoElement>(null);
  const connectionRef = useRef<any>(null);

  const [stream, setStream] = useState<MediaStream>();
  const [receiverSocketId, setReceiverSocketId] = useState('');
  const [callerSignal, setCallerSignal] = useState<any>(null);
  const [callerSocketId, setCallerSocketId] = useState('');
  const [receivingCall, setReceivingCall] = useState(false);

  useEffect(() => {
    socket.connect();

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream);

        if (myVideo.current) {
          myVideo.current.srcObject = currentStream;
        }
      });

    socket.on('incomingCall', (data) => {
      setReceivingCall(true);
      setCallerSocketId(data.callerSocketId);
      setCallerSignal(data.signal);
    });

    socket.on('callAccepted', (data) => {
      connectionRef.current.signal(data.signal);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const callUser = () => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on('signal', (signal) => {
      socket.emit('callUser', {
        receiverSocketId,
        callerSocketId: socket.id,
        signal,
      });
    });

    peer.on('stream', (currentStream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = currentStream;
      }
    });

    connectionRef.current = peer;
  };

  const answerCall = () => {
    setReceivingCall(false);

    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
    });

    peer.on('signal', (signal) => {
      socket.emit('answerCall', {
        callerSocketId,
        signal,
      });
    });

    peer.on('stream', (currentStream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = currentStream;
      }
    });

    peer.signal(callerSignal);

    connectionRef.current = peer;
  };

  const endCall = () => {
    connectionRef.current?.destroy();
    window.location.reload();
  };

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold">Audio / Video Call</h1>

      <p className="mb-2">
        Your Socket ID: <b>{socket.id}</b>
      </p>

      <input
        className="mb-4 w-full rounded border p-2"
        placeholder="Enter receiver socket ID"
        onChange={(e) => setReceiverSocketId(e.target.value)}
      />

      <div className="mb-4 flex gap-2">
        <button
          onClick={callUser}
          className="rounded bg-green-600 px-4 py-2 text-white"
        >
          Call
        </button>

        <button
          onClick={endCall}
          className="rounded bg-red-600 px-4 py-2 text-white"
        >
          End Call
        </button>
      </div>

      {receivingCall && (
        <button
          onClick={answerCall}
          className="mb-4 rounded bg-blue-600 px-4 py-2 text-white"
        >
          Answer Call
        </button>
      )}

      <div className="grid grid-cols-2 gap-4">
        <video
          ref={myVideo}
          autoPlay
          muted
          playsInline
          className="h-[300px] w-full rounded bg-black"
        />

        <video
          ref={userVideo}
          autoPlay
          playsInline
          className="h-[300px] w-full rounded bg-black"
        />
      </div>
    </div>
  );
}