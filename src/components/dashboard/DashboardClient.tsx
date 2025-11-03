'use client';

import Link from 'next/link';
import {
  ClipboardCheck,
  BookUser,
  Biohazard,
  Wrench,
  FileText,
  Contact2,
  UsersRound,
  ShieldAlert,
  LayoutDashboard,
  FilePlus2,
  HardHat,
  LogOut,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, query, where, type CollectionReference } from 'firebase/firestore';
import type { LeavePermit } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

const dashboardItems = [
  {
    href: '/admin-dashboard',
    icon: LayoutDashboard,
    title: 'Dashboard Admin',
    description: 'Visualisasi data dan ringkasan operasional.',
    roles: ['admin'],
    iconBgColor: 'bg-orange-100',
    iconColor: 'text-orange-600',
  },
  {
    href: '/absensi',
    icon: ClipboardCheck,
    title: 'Absensi Pegawai',
    description: 'Catat kehadiran harian, shift, dan rekapitulasi.',
    roles: ['admin', 'employee', 'security'],
    iconBgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    href: '/buku-tamu',
    icon: BookUser,
    title: 'Buku Tamu',
    description: 'Pencatatan tamu atau pengunjung yang datang.',
    roles: ['admin', 'employee', 'security', 'receptionist'],
    iconBgColor: 'bg-green-100',
    iconColor: 'text-green-600',
  },
   {
    href: '/izin-keluar',
    icon: LogOut,
    title: 'Izin Keluar',
    description: 'Form pengajuan dan rekapitulasi izin keluar area.',
    roles: ['admin', 'employee', 'security', 'receptionist'],
    iconBgColor: 'bg-gray-100',
    iconColor: 'text-gray-600',
    badgeId: 'pendingPermits',
  },
  {
    href: '/lemburan',
    icon: FilePlus2,
    title: 'Form Lemburan',
    description: 'Buat dan rekapitulasi data lembur pegawai.',
    roles: ['admin', 'employee', 'security', 'receptionist'],
    iconBgColor: 'bg-cyan-100',
    iconColor: 'text-cyan-600',
  },
  {
    href: '/safety-briefing',
    icon: HardHat,
    title: 'Buku Safety Briefing',
    description: 'Catat dan dokumentasikan kegiatan safety briefing harian.',
    roles: ['admin', 'employee', 'security'],
    iconBgColor: 'bg-pink-100',
    iconColor: 'text-pink-600',
  },
  {
    href: '/limbah',
    icon: Biohazard,
    title: 'Data Limbah B3',
    description: 'Manajemen dan pelacakan limbah bahan berbahaya.',
    roles: ['admin'],
    iconBgColor: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
  },
  {
    href: '/sarpras',
    icon: Wrench,
    title: 'Sarana & Prasarana',
    description: 'Inventaris dan status fasilitas pendukung.',
    roles: ['admin'],
    iconBgColor: 'bg-purple-100',
    iconColor: 'text-purple-600',
  },
  {
    href: '/laporan-harian',
    icon: FileText,
    title: 'Laporan Harian',
    description: 'Buat dan arsipkan laporan operasional harian.',
    roles: ['admin', 'employee', 'security', 'receptionist'],
    iconBgColor: 'bg-red-100',
    iconColor: 'text-red-600',
  },
  {
    href: '/kontak',
    icon: Contact2,
    title: 'Kontak Penting',
    description: 'Daftar kontak darurat dan internal.',
    roles: ['admin', 'employee', 'security', 'receptionist'],
    iconBgColor: 'bg-teal-100',
    iconColor: 'text-teal-600',
  },
  {
    href: '/manajemen-user',
    icon: UsersRound,
    title: 'Manajemen User',
    description: 'Kelola akun dan hak akses pegawai.',
    roles: ['admin'],
    iconBgColor: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
  },
];


export default function DashboardClient() {
  const { user, loading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  const pendingPermitsQuery = useMemoFirebase(() => {
    if (!firestore || user?.role !== 'admin') return null;
    const permitsCollection = collection(firestore, 'leave-permits') as CollectionReference<LeavePermit>;
    return query(permitsCollection, where('status', '==', 'Pending'));
  }, [firestore, user?.role]);

  const { data: pendingPermits } = useCollection<LeavePermit>(pendingPermitsQuery);
  const pendingPermitsCount = useMemo(() => pendingPermits?.length || 0, [pendingPermits]);

  const visibleItems = user?.role ? dashboardItems.filter(item => item.roles.includes(user.role!)) : [];

  const renderDashboardContent = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 9 }).map((_, index) => (
            <Card key={index} className="h-full flex flex-col items-center text-center p-6">
              <Skeleton className="h-16 w-16 rounded-full mb-4" />
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full" />
            </Card>
          ))}
        </div>
      );
    }
    
    if (user?.status === 'pending') {
      return (
          <div className="flex flex-col items-center justify-center text-center p-8 mt-10">
              <Card className="max-w-lg p-8">
                <ShieldAlert className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Akun Anda Menunggu Persetujuan</h2>
                <p className="text-muted-foreground">
                  Terima kasih telah mendaftar. Akun Anda sedang dalam proses peninjauan oleh administrator.
                  Anda akan mendapatkan akses penuh setelah akun Anda disetujui.
                </p>
              </Card>
          </div>
      );
    }

    if (user) {
       return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {visibleItems.map(item => (
            <Link 
              href={item.href} 
              key={item.title} 
              className="group"
            >
              <Card className="relative h-full flex flex-col items-center text-center p-6 transition-transform duration-200 ease-in-out group-hover:-translate-y-1 group-hover:shadow-lg">
                {item.badgeId === 'pendingPermits' && pendingPermitsCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-2 -right-2 z-10">
                    {pendingPermitsCount}
                  </Badge>
                )}
                <div
                  className={`rounded-full p-4 mb-4 ${item.iconBgColor} ${item.iconColor}`}
                >
                  <item.icon className="h-8 w-8" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-lg text-gray-800">{item.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 flex-grow">
                  {item.description}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      );
    }

    return null;
  }

  return (
    <>
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Dashboard Utama</h2>
      {renderDashboardContent()}
    </>
  );
}
