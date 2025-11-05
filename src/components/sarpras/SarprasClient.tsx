'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { SarprasItem } from '@/lib/types';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '../ui/badge';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, type CollectionReference } from 'firebase/firestore';
import { addSarpras } from '@/firebase/firestore/sarpras';
import { Skeleton } from '../ui/skeleton';

const sarprasSchema = z.object({
  name: z.string().min(1, 'Nama item wajib diisi'),
  category: z.string().min(1, 'Kategori wajib diisi'),
  location: z.string().min(1, 'Lokasi wajib diisi'),
  status: z.enum(['Baik', 'Perlu Perbaikan', 'Rusak']),
  lastMaintenance: z.string().min(1, 'Tanggal maintenance terakhir wajib diisi'),
});


export default function SarprasClient() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const sarprasQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'sarpras') as CollectionReference<SarprasItem>, orderBy('name', 'asc'));
  }, [firestore]);

  const { data: items, loading } = useCollection<SarprasItem>(sarprasQuery);

  const form = useForm<z.infer<typeof sarprasSchema>>({
    resolver: zodResolver(sarprasSchema),
    defaultValues: {
      name: '',
      category: '',
      location: '',
      status: 'Baik',
      lastMaintenance: new Date().toISOString().split('T')[0],
    },
  });

  async function onSubmit(values: z.infer<typeof sarprasSchema>) {
    addSarpras(firestore, values);
    toast({
      title: 'Data Tersimpan',
      description: 'Item sarana & prasarana baru telah berhasil disimpan.',
    });
    form.reset({
        name: '',
        category: '',
        location: '',
        status: 'Baik',
        lastMaintenance: new Date().toISOString().split('T')[0],
    });
  }
  
  const getStatusBadgeVariant = (status: SarprasItem['status']): "default" | "secondary" | "destructive" => {
    switch (status) {
      case 'Baik':
        return 'default';
      case 'Perlu Perbaikan':
        return 'secondary';
      case 'Rusak':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <>
      <Card className="max-w-5xl mx-auto mb-8">
        <CardHeader>
          <CardTitle>Input Item Sarana & Prasarana Baru</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Nama Item</FormLabel><FormControl><Input placeholder="Contoh: Mobil Tangki 02" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem><FormLabel>Kategori</FormLabel><FormControl><Input placeholder="Contoh: Kendaraan" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="location" render={({ field }) => (
                <FormItem><FormLabel>Lokasi</FormLabel><FormControl><Input placeholder="Contoh: Garasi B" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="lastMaintenance" render={({ field }) => (
                <FormItem><FormLabel>Maintenance Terakhir</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                        <SelectItem value="Baik">Baik</SelectItem>
                        <SelectItem value="Perlu Perbaikan">Perlu Perbaikan</SelectItem>
                        <SelectItem value="Rusak">Rusak</SelectItem>
                    </SelectContent>
                </Select><FormMessage /></FormItem>
              )} />
              <div className="md:col-span-2 text-right">
                <Button type="submit" disabled={form.formState.isSubmitting}>Simpan Item</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card className="max-w-5xl mx-auto mt-8">
        <CardHeader>
            <CardTitle>Daftar Inventaris Sarana & Prasarana</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Lokasi</TableHead>
                        <TableHead>Maintenance Terakhir</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                     {loading ? (
                      Array.from({ length: 3 }).map((_, index) => (
                        <TableRow key={index}>
                          <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                        </TableRow>
                      ))
                    ) : items && items.length > 0 ? (
                        items.map(item => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell>{item.category}</TableCell>
                                <TableCell>{item.location}</TableCell>
                                <TableCell>{new Date(item.lastMaintenance + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</TableCell>
                                <TableCell>
                                    <Badge variant={getStatusBadgeVariant(item.status)}>{item.status}</Badge>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center">Belum ada data inventaris tersimpan.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
            </div>
        </CardContent>
      </Card>
    </>
  );
}

    
    