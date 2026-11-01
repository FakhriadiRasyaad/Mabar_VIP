'use client';

import { useState } from 'react';

interface LogoutButtonProps {
  className?: string;
}

export default function LogoutButton({
  className = '',
}: LogoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (!confirm('Apakah Anda yakin ingin keluar (logout)?')) return;
    setLoading(true);

    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      window.location.href = '/login';
    }
  };

  return (
    <button
      disabled={loading}
      onClick={handleLogout}
      className={`nb-btn nb-btn-danger nb-btn-sm text-xs ${className}`}
    >
      {loading ? (
        <span className="flex items-center gap-1.5">
          ⏳ Keluar...
        </span>
      ) : (
        <span className="flex items-center gap-1.5 font-bold">
          🚪 Logout
        </span>
      )}
    </button>
  );
}
