'use client';

import Header from '@/components/common/Header';
import DashboardClient from '@/components/dashboard/DashboardClient';

export default function Home() {
  return (
    <>
      <Header />
      <main className="p-4 md:p-8">
        <DashboardClient />
      </main>
    </>
  );
}
