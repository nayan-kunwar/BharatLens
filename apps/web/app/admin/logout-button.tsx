'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      className="button button--ghost"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch('/api/admin-session', { method: 'DELETE' });
        router.push('/admin/login');
        router.refresh();
      }}
    >
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
