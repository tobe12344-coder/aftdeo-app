
import BackButton from '@/components/common/BackButton';
import Header from '@/components/common/Header';
import LemburanClient from '@/components/lemburan/LemburanClient';
import { employees } from '@/lib/data';

export default function LemburanPage() {
  return (
    <>
      <Header />
      <div className="p-4 md:p-8">
        <BackButton />
        <LemburanClient employees={employees} />
      </div>
    </>
  );
}
