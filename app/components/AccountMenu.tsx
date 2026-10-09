'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type AuthUser = { username: string; role: 'user' | 'admin' };

export default function AccountMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let active = true;
    fetch('http://localhost:8080/api/auth/session', { credentials: 'include', cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (active) setUser(result?.user ?? null);
      })
      .catch(() => {
        if (active) setUser(null);
      });
    return () => { active = false; };
  }, [pathname]);

  async function handleLogout() {
    await fetch('http://localhost:8080/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    }).catch(() => undefined);
    setUser(null);
    router.replace('/');
    router.refresh();
  }

  if (!user) {
    return <Link href="/login" className="rounded-md border border-neutral-700 px-3 py-2 text-sm font-medium hover:border-red-500 hover:text-red-300 transition-colors">Masuk</Link>;
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="hidden sm:inline text-neutral-300">{user.username} <span className="text-neutral-500">· {user.role === 'admin' ? 'Admin' : 'User'}</span></span>
      {user.role === 'admin' && <Link href="/admin" className="text-neutral-300 hover:text-red-300 transition-colors">Admin</Link>}
      <button onClick={handleLogout} className="rounded-md border border-neutral-700 px-3 py-2 hover:border-red-500 hover:text-red-300 transition-colors">Keluar</button>
    </div>
  );
}