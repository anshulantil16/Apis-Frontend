/* TA/DA portal entry - login gate, then the signed-in portal. */
import { useState } from 'react';
import { type User } from './shared';
import { Login } from './Login';
import { Portal } from './Portal';

export function TadaPage(_props: { onNavigateBack?: () => void } = {}) {
  const [user, setUser] = useState<User | null>(() => { try { return JSON.parse(localStorage.getItem('tada_user') || 'null'); } catch { return null; } });
  const logout = () => { localStorage.removeItem('tada_user'); setUser(null); };
  if (!user) return <Login onLogin={setUser} />;
  return <Portal user={user} onLogout={logout} />;
}

export default TadaPage;
