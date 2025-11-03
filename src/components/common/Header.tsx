'use client';

import { useAuth, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Badge } from '../ui/badge';

export default function Header() {
  const { user, loading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'security':
        return 'secondary';
      default:
        return 'default';
    }
  }

  return (
    <header className="pertamina-header-gradient text-white shadow-lg p-4 flex justify-between items-center">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">
          SISTEM MANAJEMEN AFTDEO SORONG
        </h1>
        <p className="text-sm opacity-90">PT Pertamina (Persero)</p>
      </div>
      {user && !loading && (
        <div className="flex items-center gap-4">
          <div className="text-right">
              <p className="font-semibold text-sm">{user.email}</p>
              {user.role && (
                <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs mt-1 capitalize">
                  {user.role} {user.status === 'pending' && '(Pending)'}
                </Badge>
              )}
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="text-xs h-auto px-3 py-1"
            onClick={handleLogout}
          >
            Logout
          </Button>
        </div>
      )}
    </header>
  );
}
