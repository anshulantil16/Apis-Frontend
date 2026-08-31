/* The gate every screen sits behind.
 *
 * Renders nothing until we know who (if anyone) is signed in — showing the
 * dashboard for a frame and then yanking it away would be worse than a short
 * blank, and would flash real data at someone who is not signed in.
 */
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { LoginPortal } from './LoginPortal';
import { fetchMe, signOut, type PortalUser } from './session';

export function PortalGate({ children }: {
  children: (session: { user: PortalUser; signOut: () => void }) => React.ReactNode;
}) {
  const [user, setUser] = useState<PortalUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchMe().then(u => { if (!cancelled) { setUser(u); setChecking(false); } });
    return () => { cancelled = true; };
  }, []);

  const out = async () => { await signOut(); setUser(null); };

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
      </div>
    );
  }
  if (!user) return <LoginPortal onSignedIn={setUser} />;
  return <>{children({ user, signOut: out })}</>;
}
