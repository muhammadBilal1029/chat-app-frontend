'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  });

  const register = async () => {
    const res = await api.post('/auth/register', form);

    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));

    router.push('/chat');
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-[350px] space-y-4 rounded-xl border p-6">
        <h1 className="text-2xl font-bold">Register</h1>

        <input
          className="w-full rounded border p-2"
          placeholder="Name"
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <input
          className="w-full rounded border p-2"
          placeholder="Email"
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <input
          className="w-full rounded border p-2"
          placeholder="Password"
          type="password"
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        <button
          onClick={register}
          className="w-full rounded bg-black p-2 text-white"
        >
          Register
        </button>
      </div>
    </div>
  );
}