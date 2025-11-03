
'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { CameraOff } from 'lucide-react';

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (result: string) => void;
}

export default function BarcodeScanner({
  open,
  onOpenChange,
  onScan,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(
    null
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    let isMounted = true;
    const codeReader = new BrowserMultiFormatReader();

    const stopCamera = () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    };

    const startScanning = async () => {
      if (!videoRef.current) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (isMounted) {
          setHasCameraPermission(true);
          videoRef.current.srcObject = stream;

          codeReader.decodeFromStream(
            stream,
            videoRef.current,
            (result, err) => {
              if (isMounted && result) {
                onScan(result.getText());
                onOpenChange(false);
              }
              if (err && err.name !== 'NotFoundException') {
                console.error('Barcode decoding error:', err);
              }
            }
          );
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        if (isMounted) {
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Akses Kamera Ditolak',
            description: 'Mohon izinkan akses kamera di pengaturan browser Anda.',
          });
          onOpenChange(false); // Close dialog if permission is denied
        }
      }
    };

    startScanning();

    return () => {
      isMounted = false;
      stopCamera();
      codeReader.reset();
    };
  }, [open, onOpenChange, onScan, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Pindai Barcode / QR Code</DialogTitle>
          <DialogDescription>
            Arahkan kamera ke barcode pada ID card pegawai.
          </DialogDescription>
        </DialogHeader>
        <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-muted">
          <video ref={videoRef} className="h-full w-full object-cover" autoPlay playsInline />
          {hasCameraPermission === false && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white">
              <CameraOff className="h-12 w-12" />
              <p className="mt-2">Kamera tidak tersedia</p>
              <p className="text-sm text-muted-foreground">
                Izinkan akses kamera untuk memulai.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
