
import BackButton from '@/components/common/BackButton';
import Header from '@/components/common/Header';
import LeavePermitClient from '@/components/izin-keluar/LeavePermitClient';
import { employees } from '@/lib/data';

export default function IzinKeluarPage() {
  return (
    <>
      <Header />
      <div className="p-4 md:p-8">
        <BackButton />
        <LeavePermitClient employees={employees} />
      </div>
    </>
  );
}
