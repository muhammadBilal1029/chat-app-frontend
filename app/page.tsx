import Link from "next/link";
import { MessageCircle, Phone, Video, Shield } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 text-white">
      {/* Navbar */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <h1 className="text-2xl font-bold">
          Connect<span className="text-blue-500">Hub</span>
        </h1>

        <div className="flex gap-4">
          <Link
            href="/login"
            className="rounded-lg border border-white/20 px-5 py-2 hover:bg-white/10"
          >
            Login
          </Link>

          <Link
            href="/register"
            className="rounded-lg bg-blue-600 px-5 py-2 hover:bg-blue-700"
          >
            Register
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto flex max-w-7xl flex-col items-center px-6 py-24 text-center">
        <h1 className="max-w-4xl text-5xl font-bold leading-tight md:text-7xl">
          Chat, Voice & Video Calls
          <span className="block text-blue-500">
            All In One Platform
          </span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-gray-300">
          Connect instantly with friends, family, and teams using
          real-time messaging, voice calls, video calls, file sharing,
          and more.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/register"
            className="rounded-xl bg-blue-600 px-8 py-4 text-lg font-semibold hover:bg-blue-700"
          >
            Get Started
          </Link>

          <Link
            href="/login"
            className="rounded-xl border border-white/20 px-8 py-4 text-lg font-semibold hover:bg-white/10"
          >
            Login
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <MessageCircle className="mb-4 h-10 w-10 text-blue-500" />
            <h3 className="mb-2 text-xl font-semibold">
              Real-Time Chat
            </h3>
            <p className="text-gray-400">
              Instant messaging with typing indicators, read receipts,
              and file sharing.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <Phone className="mb-4 h-10 w-10 text-green-500" />
            <h3 className="mb-2 text-xl font-semibold">
              Voice Calls
            </h3>
            <p className="text-gray-400">
              Crystal-clear audio calls powered by WebRTC.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <Video className="mb-4 h-10 w-10 text-red-500" />
            <h3 className="mb-2 text-xl font-semibold">
              Video Meetings
            </h3>
            <p className="text-gray-400">
              One-to-one and group video calls with screen sharing.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <Shield className="mb-4 h-10 w-10 text-yellow-500" />
            <h3 className="mb-2 text-xl font-semibold">
              Secure Platform
            </h3>
            <p className="text-gray-400">
              Protected authentication and secure communication.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/10 py-20 text-center">
        <h2 className="text-4xl font-bold">
          Start Communicating Today
        </h2>

        <p className="mx-auto mt-4 max-w-xl text-gray-400">
          Join thousands of users who chat, call, and collaborate in
          real-time.
        </p>

        <Link
          href="/register"
          className="mt-8 inline-block rounded-xl bg-blue-600 px-8 py-4 text-lg font-semibold hover:bg-blue-700"
        >
          Create Free Account
        </Link>
      </section>
    </main>
  );
}