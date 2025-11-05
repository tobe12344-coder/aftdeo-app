'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Guest } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '../ui/separator';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { addGuest } from '@/firebase/firestore/guests';
import { collection, query, orderBy, Timestamp, where, type CollectionReference } from 'firebase/firestore';
import { useState, useRef, useEffect } from 'react';
import { Skeleton } from '../ui/skeleton';
import { FileText, Eraser } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import SignatureCanvas from 'react-signature-canvas';
import { useResizeDetector } from 'react-resize-detector';
import { startOfMonth, endOfMonth } from 'date-fns';

// Extend jsPDF to include autoTable
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

const guestSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(50, 'Nama terlalu panjang'),
  alamat: z.string().min(1, 'Alamat wajib diisi'),
  perusahaan: z.string().min(1, 'Perusahaan wajib diisi'),
  yangDikunjungi: z.string().min(1, 'Field ini wajib diisi'),
  maksudKunjungan: z.string().min(1, 'Pesan wajib diisi').max(500, 'Pesan terlalu panjang'),
  tandaPengenal: z.string().min(1, 'Nomor tanda pengenal wajib diisi'),
  zona: z.enum(['Bebas', 'Terbatas', 'Terlarang'], {
    required_error: 'Pilih salah satu zona',
  }),
  signature: z.string().min(1, 'Tanda tangan wajib diisi'),
});

export default function GuestbookClient() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const sigPadRef = useRef<SignatureCanvas>(null);
  const { width: sigPadContainerWidth, ref: sigPadContainerRef } = useResizeDetector();


  const guestsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const selectedDate = new Date(selectedMonth + '-02'); // Use second day to avoid timezone issues
    const startDate = startOfMonth(selectedDate);
    const endDate = endOfMonth(selectedDate);

    return query(
      collection(firestore, 'guests') as CollectionReference<Guest>, 
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      where('timestamp', '<=', Timestamp.fromDate(endDate)),
      orderBy('timestamp', 'desc')
    );
  }, [firestore, selectedMonth]);

  const { data: guests, loading } = useCollection<Guest>(guestsQuery);

  const form = useForm<z.infer<typeof guestSchema>>({
    resolver: zodResolver(guestSchema),
    defaultValues: {
      name: '',
      alamat: '',
      perusahaan: '',
      yangDikunjungi: '',
      maksudKunjungan: '',
      tandaPengenal: '',
      signature: '',
    },
  });

  // Sync signature pad with form state
  useEffect(() => {
    const sigPad = sigPadRef.current;
    if (sigPad) {
      const handleEnd = () => {
        if (!sigPad.isEmpty()) {
          form.setValue('signature', sigPad.toDataURL('image/png'), { shouldValidate: true });
        } else {
          form.setValue('signature', '', { shouldValidate: true });
        }
      };
      // We need to get the canvas element to add event listener
      const canvas = sigPad.getCanvas();
      canvas.addEventListener('mouseup', handleEnd);
      canvas.addEventListener('touchend', handleEnd);
      return () => {
        canvas.removeEventListener('mouseup', handleEnd);
        canvas.removeEventListener('touchend', handleEnd);
      };
    }
  }, [form]);


  async function onSubmit(values: z.infer<typeof guestSchema>) {
    if (sigPadRef.current?.isEmpty()) {
      form.setError('signature', { type: 'manual', message: 'Tanda tangan wajib diisi' });
      return;
    }
    
    // The addGuest function will handle the error and emit it globally.
    // This allows the FirebaseErrorListener to catch it and display a detailed toast.
    addGuest(firestore, values);
    
    toast({
      title: 'Terima Kasih!',
      description: 'Pesan Anda telah berhasil ditambahkan ke buku tamu.',
    });
    sigPadRef.current?.clear();
    form.reset();
  }
  
  function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  const formatDate = (timestamp: Timestamp | Date | string | undefined) => {
    if (!timestamp) return 'No date';
    const date = (timestamp as Timestamp)?.toDate ? (timestamp as Timestamp).toDate() : new Date(timestamp as any);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
  
  const exportToPDF = () => {
    if (!guests || guests.length === 0) {
        toast({ variant: 'destructive', title: 'Tidak ada data untuk diekspor.' });
        return;
    }
    const doc = new jsPDF('landscape') as jsPDFWithAutoTable;
    const monthName = new Date(selectedMonth + '-02').toLocaleString('id-ID', { month: 'long', year: 'numeric' });
    const today = new Date();
    const formattedDate = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    doc.setFontSize(14);
    doc.text('Laporan Buku Tamu', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Periode: ${monthName}`, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });
    
    const tableData = guests.map(guest => [
        formatDate(guest.timestamp),
        guest.name,
        guest.perusahaan,
        guest.alamat,
        guest.yangDikunjungi,
        guest.maksudKunjungan,
        guest.zona,
        { content: '', image: guest.signature, width: 30 } // Placeholder for signature image
    ]);

    doc.autoTable({
        head: [['Tanggal', 'Nama', 'Perusahaan', 'Alamat', 'Yang Dikunjungi', 'Maksud Kunjungan', 'Zona', 'Tanda Tangan']],
        body: tableData,
        startY: 30,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1.5, minCellHeight: 15, valign: 'middle' },
        headStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: 'bold' },
        didParseCell: (data) => {
            if (data.column.index === 7 && typeof data.cell.raw === 'object' && data.cell.raw !== null && 'image' in data.cell.raw) {
                data.cell.text = ''; // Clear text to only show image
            }
        },
        didDrawCell: (data) => {
            if (data.column.index === 7 && data.cell.raw && typeof data.cell.raw === 'object' && 'image' in data.cell.raw) {
                const imgData = (data.cell.raw as { image: string }).image;
                if (imgData) {
                    doc.addImage(imgData, 'PNG', data.cell.x + 2, data.cell.y + 2, 25, 10);
                }
            }
        }
    });
    
    const finalY = doc.autoTable.previous.finalY;
    doc.setFontSize(10);
    doc.text(`Sorong, ${formattedDate}`, doc.internal.pageSize.getWidth() - 20, finalY + 15, { align: 'right' });
    doc.text('Mengetahui,', doc.internal.pageSize.getWidth() - 20, finalY + 22, { align: 'right' });
    doc.text('AFT Manager Deo Sorong', doc.internal.pageSize.getWidth() - 20, finalY + 29, { align: 'right' });

    doc.text('Joni Herawan', doc.internal.pageSize.getWidth() - 20, finalY + 50, { align: 'right' });

    doc.save(`Laporan_Buku_Tamu_${selectedMonth}.pdf`);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Buku Tamu Digital</CardTitle>
          <CardDescription>Silakan tinggalkan jejak Anda dengan mengisi form di bawah ini.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Anda</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="perusahaan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asal Perusahaan/Instansi</FormLabel>
                    <FormControl>
                      <Input placeholder="PT. Suka Maju" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="alamat"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Alamat</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Jl. Pahlawan No. 123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="yangDikunjungi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Yang Dikunjungi (Fungsi)</FormLabel>
                    <FormControl>
                      <Input placeholder="HSE / Bp. Budi" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="tandaPengenal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>No. Tanda Pengenal (KTP/SIM)</FormLabel>
                    <FormControl>
                      <Input placeholder="3172..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
                <FormField
                control={form.control}
                name="zona"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Zona Kunjungan</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Pilih zona kunjungan" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        <SelectItem value="Bebas">Bebas</SelectItem>
                        <SelectItem value="Terbatas">Terbatas</SelectItem>
                        <SelectItem value="Terlarang">Terlarang</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
              <FormField
                control={form.control}
                name="maksudKunjungan"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Maksud Kunjungan</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Tuliskan pesan, kesan, atau keperluan Anda..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="signature"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Tanda Tangan</FormLabel>
                    <FormControl>
                      <div ref={sigPadContainerRef} className="relative w-full h-48 rounded-md border border-input bg-background">
                        <SignatureCanvas
                          ref={sigPadRef}
                          penColor='black'
                          canvasProps={{ 
                            width: sigPadContainerWidth, 
                            height: 190, 
                            className: 'sigCanvas' 
                          }}
                        />
                      </div>
                    </FormControl>
                    <div className="flex justify-between items-center">
                        <FormMessage />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                sigPadRef.current?.clear();
                                form.setValue('signature', '', { shouldValidate: true });
                            }}
                        >
                            <Eraser className="mr-2 h-4 w-4" />
                            Hapus Tanda Tangan
                        </Button>
                    </div>
                  </FormItem>
                )}
              />

              <div className="md:col-span-2 text-right">
                <Button type="submit" disabled={form.formState.isSubmitting}>Kirim Pesan</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold tracking-tight text-gray-800">Pesan Terbaru</h2>
            <div className='flex items-center gap-4'>
                <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className='border border-gray-300 rounded-md p-2 text-sm' />
                <Button variant="outline" size="sm" onClick={exportToPDF} disabled={!guests || guests.length === 0}>
                    <FileText className="mr-2 h-4 w-4" />
                    Export Laporan Tamu
                </Button>
            </div>
        </div>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : guests && guests.length > 0 ? (
          guests.map((guest, index) => (
          <div key={guest.id}>
            <div className="flex gap-4">
                <Avatar>
                    <AvatarImage src={`https://api.dicebear.com/8.x/initials/svg?seed=${guest.name}`} />
                    <AvatarFallback>{getInitials(guest.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-semibold text-gray-900">{guest.name} <span className='text-sm font-normal text-muted-foreground'>dari {guest.perusahaan}</span></p>
                            <p className='text-xs text-muted-foreground'>{guest.alamat}</p>
                        </div>
                        <p className="text-xs text-muted-foreground text-right">
                          {formatDate(guest.timestamp)}
                        </p>
                    </div>
                    <p className="mt-4 text-gray-700 bg-gray-50 p-3 rounded-md border">{guest.maksudKunjungan}</p>
                    <div className='mt-3 grid grid-cols-1 md:grid-cols-2 gap-4'>
                        <div className='text-xs text-muted-foreground space-y-2'>
                           <p>ID: <span className='font-mono p-1 rounded-sm bg-gray-100'>{guest.tandaPengenal}</span></p>
                           <p>Bertemu: <span className='font-medium text-gray-800'>{guest.yangDikunjungi}</span></p>
                           <p>Zona: <span className='font-medium text-gray-800'>{guest.zona}</span></p>
                        </div>
                         <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">Tanda Tangan</p>
                            <div className="bg-white border rounded-md p-2 flex justify-center items-center">
                               {guest.signature ? (
                                <img src={guest.signature} alt="Tanda Tangan" className="h-12 object-contain" />
                               ) : (
                                <p className="text-xs text-gray-400">Tidak ada TTD</p>
                               )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {index < guests.length - 1 && <Separator className="my-6" />}
          </div>
          ))
        ) : (
          <p>Belum ada tamu yang tercatat untuk bulan yang dipilih.</p>
        )}
      </div>
    </div>
  );
}

    