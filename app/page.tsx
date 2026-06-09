import Link from "next/link";
import { MessageCircle, Phone, Video, Shield, Users, Zap, Lock, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-2000" />
      </div>

      {/* Navbar */}
      <nav className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600">
            <MessageCircle className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold">
            Connect<span className="text-blue-500">Hub</span>
          </h1>
        </div>

        <div className="flex gap-4">
          <Link
            href="/login"
            className="rounded-lg border border-white/20 px-5 py-2 hover:bg-white/10 transition-all duration-300 hover:border-blue-500/50"
          >
            Login
          </Link>

          <Link
            href="/register"
            className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-2 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-blue-500/25"
          >
            Register
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative mx-auto flex max-w-7xl flex-col items-center px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 border border-blue-500/20 px-4 py-2 mb-8">
          <Zap className="h-4 w-4 text-blue-400" />
          <span className="text-sm text-blue-300">New: Email Verification & Contact System</span>
        </div>

        <h1 className="max-w-5xl text-5xl font-bold leading-tight md:text-7xl lg:text-8xl">
          Chat, Voice & Video Calls
          <span className="block bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
            All In One Platform
          </span>
        </h1>

        <p className="mt-8 max-w-2xl text-lg text-gray-300 leading-relaxed">
          Connect instantly with friends, family, and teams using
          real-time messaging, voice calls, video calls, file sharing,
          and more. Experience seamless communication like never before.
        </p>

        <div className="mt-12 flex flex-wrap justify-center gap-4">
          <Link
            href="/register"
            className="group rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-4 text-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-blue-500/25 hover:scale-105"
          >
            Get Started Free
            <ArrowRight className="ml-2 inline-block h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/login"
            className="rounded-xl border border-white/20 px-8 py-4 text-lg font-semibold hover:bg-white/10 transition-all duration-300 hover:border-blue-500/50"
          >
            Login
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-3 gap-8 md:gap-16">
          <div>
            <div className="text-4xl font-bold text-blue-400">10K+</div>
            <div className="text-sm text-gray-400 mt-1">Active Users</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-green-400">1M+</div>
            <div className="text-sm text-gray-400 mt-1">Messages Sent</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-purple-400">99.9%</div>
            <div className="text-sm text-gray-400 mt-1">Uptime</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative mx-auto max-w-7xl px-6 pb-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Powerful Features
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Everything you need for seamless communication in one platform
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur hover:bg-white/10 hover:border-blue-500/30 transition-all duration-300 hover:scale-105">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600">
              <MessageCircle className="h-7 w-7 text-white" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">
              Real-Time Chat
            </h3>
            <p className="text-gray-400 text-sm">
              Instant messaging with typing indicators, read receipts, and file sharing.
            </p>
          </div>

          <div className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur hover:bg-white/10 hover:border-green-500/30 transition-all duration-300 hover:scale-105">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600">
              <Phone className="h-7 w-7 text-white" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">
              Voice Calls
            </h3>
            <p className="text-gray-400 text-sm">
              Crystal-clear audio calls powered by WebRTC technology.
            </p>
          </div>

          <div className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur hover:bg-white/10 hover:border-red-500/30 transition-all duration-300 hover:scale-105">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-600">
              <Video className="h-7 w-7 text-white" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">
              Video Meetings
            </h3>
            <p className="text-gray-400 text-sm">
              One-to-one video calls with screen sharing capabilities.
            </p>
          </div>

          <div className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur hover:bg-white/10 hover:border-yellow-500/30 transition-all duration-300 hover:scale-105">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600">
              <Shield className="h-7 w-7 text-white" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">
              Secure Platform
            </h3>
            <p className="text-gray-400 text-sm">
              Email verification and secure authentication for your safety.
            </p>
          </div>

          <div className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur hover:bg-white/10 hover:border-purple-500/30 transition-all duration-300 hover:scale-105">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600">
              <Users className="h-7 w-7 text-white" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">
              Contact System
            </h3>
            <p className="text-gray-400 text-sm">
              Add contacts by email and get notified when someone adds you.
            </p>
          </div>

          <div className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur hover:bg-white/10 hover:border-cyan-500/30 transition-all duration-300 hover:scale-105">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600">
              <Zap className="h-7 w-7 text-white" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">
              Lightning Fast
            </h3>
            <p className="text-gray-400 text-sm">
              Optimized for speed with instant message delivery.
            </p>
          </div>

          <div className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur hover:bg-white/10 hover:border-pink-500/30 transition-all duration-300 hover:scale-105">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-pink-600">
              <Lock className="h-7 w-7 text-white" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">
              End-to-End Encryption
            </h3>
            <p className="text-gray-400 text-sm">
              Your conversations are protected with advanced encryption.
            </p>
          </div>

          <div className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur hover:bg-white/10 hover:border-orange-500/30 transition-all duration-300 hover:scale-105">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600">
              <ArrowRight className="h-7 w-7 text-white" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">
              Easy to Use
            </h3>
            <p className="text-gray-400 text-sm">
              Intuitive interface designed for everyone.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative border-t border-white/10 py-20 text-center">
        <div className="mx-auto max-w-7xl px-6">
          <div className="rounded-3xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10 p-12 backdrop-blur">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Ready to Connect?
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-gray-300 text-lg">
              Join thousands of users who chat, call, and collaborate in
              real-time. Start your journey today.
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                href="/register"
                className="group rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-4 text-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-blue-500/25 hover:scale-105"
              >
                Create Free Account
                <ArrowRight className="ml-2 inline-block h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/login"
                className="rounded-xl border border-white/20 px-8 py-4 text-lg font-semibold hover:bg-white/10 transition-all duration-300 hover:border-blue-500/50"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-gray-400 text-sm">
        <p>© 2024 ConnectHub. All rights reserved.</p>
      </footer>
    </main>
  );
}