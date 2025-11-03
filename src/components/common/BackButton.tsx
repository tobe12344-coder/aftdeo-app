
'use client';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';

export default function BackButton({ href = '/' }: { href?: string }) {
  const router = useRouter();
  
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (href === '/') {
        router.push(href);
    } else {
        router.back();
    }
  };

  return (
    <Button
      variant="ghost"
      onClick={handleClick}
      className="mb-6 inline-flex items-center gap-2 text-primary hover:underline hover:bg-transparent px-0"
    >
      <ArrowLeft className="h-5 w-5" />
      Kembali ke Dashboard
    </Button>
  );
}
