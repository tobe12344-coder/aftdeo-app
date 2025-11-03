
import BackButton from '@/components/common/BackButton';
import AttendanceClient from '@/components/absensi/AttendanceClient';
import { employees } from '@/lib/data';
import Header from '@/components/common/Header';

export default function AbsensiPage() {
  return (
    <>
      <Header />
      <div className="p-4 md:p-8">
        <BackButton />
        <AttendanceClient employees={employees} />
      </div>
    </>
  );
}
