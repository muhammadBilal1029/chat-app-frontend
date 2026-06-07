'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
//   const router = useRouter();

  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const [loading, setLoading] =
  useState(false);

const login = async () => {
    console.log('LOGIN FUNCTION STARTED');
     alert(
  api.defaults.baseURL);
   alert(
 process.env.NEXT_PUBLIC_API_URL);
  try {
   
    setLoading(true);
   console.log('FORM DATA', form);
    console.log('API URL', api.defaults.baseURL);
    console.log(
  'BASE URL:',
  api.defaults.baseURL
);

    const res = await api.post(
      '/auth/login',
      form,
    );

    localStorage.setItem(
      'token',
      res.data.token,
    );

    localStorage.setItem(
      'user',
      JSON.stringify(res.data.user),
    );

    alert('Login successful');

    window.location.href = '/chat';
  } catch (error: any) {
      console.log('FULL ERROR:', error);

  alert(
    JSON.stringify(
      {
        code: error?.code,
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
      },
      null,
      2
    )
  );
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-[350px] space-y-4 rounded-xl border p-6">
        <h1 className="text-2xl font-bold">Login</h1>

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
  onClick={() => {
    alert('Button Clicked');
    console.log('Button Clicked');
    login();
  }}
  disabled={loading}
  className="w-full rounded-lg bg-blue-600 py-3 text-white disabled:opacity-50"
>
  {loading ? 'Logging in...' : 'Login'}
</button>
      </div>
    </div>
  );
}