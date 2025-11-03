
import BackButton from '@/components/common/BackButton';
import LimbahClient from '@/components/limbah/LimbahClient';
import Header from '@/components/common/Header';

export default function LimbahPage() {
  return (
    <>
      <Header />
      <div className="p-4 md:p-8">
        <BackButton />
        <LimbahClient />
      </div>
    </>
  );
}
