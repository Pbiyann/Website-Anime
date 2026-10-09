'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Konfirmasi password belum sama.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8080/api/auth/register', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Pendaftaran gagal.');
      router.replace('/');
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
        <h1 className="text-2xl font-bold">Buat akun user</h1>
        <p className="text-neutral-400 mt-2 mb-6">Daftar untuk menyimpan akun dan masuk kembali nanti.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium">
            Username
            <input autoComplete="username" required minLength={3} maxLength={32} pattern="[A-Za-z0-9._-]+" title="Gunakan huruf, angka, titik, garis bawah, atau tanda hubung." value={username} onChange={(event) => setUsername(event.target.value)} className="mt-2 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-3 text-white outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/30" />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-3 text-white outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/30" />
          </label>
          <label className="block text-sm font-medium">
            Ulangi password
            <input type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-2 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-3 text-white outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/30" />
          </label>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-md bg-red-600 py-3 font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-wait disabled:opacity-60">
            {loading ? 'Membuat akun...' : 'Daftar'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-neutral-400">Sudah punya akun?{' '}<Link href="/login" className="font-medium text-red-400 hover:text-red-300">Masuk</Link></p>
      </div>
    </section>
  );
}