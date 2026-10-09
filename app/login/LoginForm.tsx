'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type AccountRole = 'user' | 'admin';

export default function LoginForm({ initialRole }: { initialRole: AccountRole }) {
  const router = useRouter();
  const [role, setRole] = useState<AccountRole>(initialRole);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Login gagal.');
      router.replace(result.user.role === 'admin' ? '/admin' : '/');
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Tidak dapat terhubung ke server.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="max-w-md mx-auto my-8 sm:my-16">
      <div className="border border-neutral-800 bg-neutral-900 p-6 sm:p-8 rounded-lg shadow-2xl shadow-black/30">
        <p className="text-sm uppercase tracking-widest text-red-400 mb-2">NontonAnime</p>
        <h1 className="text-2xl font-bold">Masuk ke akun</h1>
        <p className="text-neutral-400 mt-2 mb-6">Pilih jenis akun untuk melanjutkan.</p>
        <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-neutral-950 mb-6" role="group" aria-label="Jenis akun">
          {(['user', 'admin'] as const).map((item) => (
            <button key={item} type="button" aria-pressed={role === item} onClick={() => setRole(item)} className={`py-2 rounded-md font-medium transition-colors ${role === item ? 'bg-red-600 text-white' : 'text-neutral-400 hover:text-white'}`}>
              {item === 'user' ? 'User' : 'Admin'}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium">
            Username
            <input autoComplete="username" required minLength={3} maxLength={32} value={username} onChange={(event) => setUsername(event.target.value)} className="mt-2 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-3 text-white outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/30" />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input type="password" autoComplete="current-password" required minLength={role === 'admin' ? 12 : 8} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-3 text-white outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/30" />
          </label>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          {role === 'admin' && <p className="text-xs leading-5 text-neutral-500">Akun admin dikelola melalui konfigurasi server dan tidak dapat didaftarkan dari halaman ini.</p>}
          <button type="submit" disabled={loading} className="w-full rounded-md bg-red-600 py-3 font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-wait disabled:opacity-60">
            {loading ? 'Memeriksa akun...' : role === 'admin' ? 'Masuk sebagai admin' : 'Masuk'}
          </button>
        </form>
        {role === 'user' && <p className="mt-6 text-center text-sm text-neutral-400">Belum punya akun?{' '}<Link href="/register" className="font-medium text-red-400 hover:text-red-300">Daftar</Link></p>}
      </div>
    </section>
  );
}