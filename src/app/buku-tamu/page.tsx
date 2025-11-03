
import BackButton from '@/components/common/BackButton';
import GuestbookClient from '@/components/buku-tamu/GuestbookClient';
import Header from '@/components/common/Header';

export default function BukuTamuPage() {
  return (
    <>
      <Header />
      <div className="p-4 md:p-8">
        <BackButton />
        <GuestbookClient />
      </div>
    </>
  );
}
