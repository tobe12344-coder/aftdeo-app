'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { WasteData } from '@/lib/types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { FileDown, FileText, MoreHorizontal, Trash2, Edit } from 'lucide-react';
import { useState } from 'react';


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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from '@/components/ui/dialog';

import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, type CollectionReference } from 'firebase/firestore';
import { addWaste, updateWaste, deleteWaste } from '@/firebase/firestore/waste';
import { Skeleton } from '../ui/skeleton';
import WasteBalanceSheet from './WasteBalanceSheet';
import WasteLogbook from './WasteLogbook';

const limbahSchema = z.object({
  jenis: z.enum([
    'Oli bekas',
    'Filter Bekas',
    'Accu Bekas',
    'Kemasan Tinta Bekas',
    'Kain Majun Bekas',
    'Lampu Bekas',
  ]),
  sumber: z.enum(['Proses', 'Operasional', 'Kantor']),
  jumlah: z.coerce.number().min(0.1, 'Jumlah harus lebih dari 0'),
  unit: z.enum(['Kg', 'Liter', 'TON']),
  tanggalMasuk: z.string().min(1, 'Tanggal masuk wajib diisi'),
  status: z.string(),
  perlakuan: z.string(),
  kodeManifestasi: z.string().optional(),
  catatan: z.string().optional(),
});

type LimbahFormValues = z.infer<typeof limbahSchema>;

export default function LimbahClient() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isEditOpen, setEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WasteData | null>(null);

  const wasteQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'waste') as CollectionReference<WasteData>, orderBy('tanggalMasuk', 'desc'));
  }, [firestore]);

  const { data: wasteData, loading } = useCollection<WasteData>(wasteQuery);

  const form = useForm<LimbahFormValues>({
    resolver: zodResolver(limbahSchema),
    defaultValues: {
      jumlah: 0,
      unit: 'Kg',
      tanggalMasuk: new Date().toISOString().split('T')[0],
      status: 'Disimpan Sementara',
      perlakuan: 'DISIMPAN DI TPS',
      kodeManifestasi: '',
      catatan: '',
    },
  });

  const editForm = useForm<LimbahFormValues>({
    resolver: zodResolver(limbahSchema),
  });

  async function onSubmit(values: LimbahFormValues) {
    addWaste(firestore, values);
    toast({
      title: 'Data Tersimpan',
      description: 'Data limbah baru telah berhasil disimpan.',
    });
    form.reset({
      jumlah: 0,
      unit: 'Kg',
      tanggalMasuk: new Date().toISOString().split('T')[0],
      status: 'Disimpan Sementara',
      perlakuan: 'DISIMPAN DI TPS',
      kodeManifestasi: '',
      catatan: '',
    });
  }
  
  async function onEditSubmit(values: LimbahFormValues) {
    if (!editingItem) return;
    updateWaste(firestore, editingItem.id, values);
    toast({
        title: 'Data Diperbarui',
        description: 'Data limbah telah berhasil diperbarui.',
    });
    setEditOpen(false);
    setEditingItem(null);
  }

  const handleOpenEditDialog = (item: WasteData) => {
    setEditingItem(item);
    editForm.reset(item);
    setEditOpen(true);
  };
  
  const handleDelete = () => {
    if (!itemToDelete || !firestore) return;
    deleteWaste(firestore, itemToDelete);
    toast({
        title: 'Data Dihapus',
        description: 'Data limbah telah berhasil dihapus.',
    });
    setItemToDelete(null);
  };

  const exportToExcel = () => {
    if (!wasteData) return;
    const worksheet = XLSX.utils.json_to_sheet(wasteData.map(item => ({
      'Jenis Limbah': item.jenis,
      'Jumlah': `${item.jumlah} ${item.unit}`,
      'Tanggal Masuk': new Date(item.tanggalMasuk + 'T00:00:00').toLocaleDateString('id-ID'),
      'Sumber': item.sumber,
      'Status': item.status,
      'Perlakuan': item.perlakuan,
      'Kode Manifestasi': item.kodeManifestasi || '-',
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Limbah B3');
    XLSX.writeFile(workbook, 'Data_Limbah_B3.xlsx');
  };

  const exportToPDF = () => {
    if (!wasteData) return;
    const doc = new jsPDF();
    doc.text('Daftar Limbah B3 Tersimpan', 14, 16);
    (doc as any).autoTable({
      head: [['Jenis Limbah', 'Jumlah', 'Tanggal Masuk', 'Sumber', 'Status', 'Perlakuan', 'Kode Manifestasi']],
      body: wasteData.map(item => [
        item.jenis,
        `${item.jumlah} ${item.unit}`,
        new Date(item.tanggalMasuk + 'T00:00:00').toLocaleDateString('id-ID'),
        item.sumber,
        item.status,
        item.perlakuan,
        item.kodeManifestasi || '-',
      ]),
      startY: 20,
    });
    doc.save('Data_Limbah_B3.pdf');
  };


  return (
    <>
      <Card className="max-w-5xl mx-auto mb-8">
        <CardHeader>
          <CardTitle>Input Data Limbah B3 Baru</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="jenis" render={({ field }) => (
                <FormItem><FormLabel>Jenis Limbah</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Pilih jenis limbah..." /></SelectTrigger></FormControl>
                    <SelectContent>
                        <SelectItem value="Oli bekas">Oli bekas</SelectItem>
                        <SelectItem value="Filter Bekas">Filter Bekas</SelectItem>
                        <SelectItem value="Accu Bekas">Accu Bekas</SelectItem>
                        <SelectItem value="Kemasan Tinta Bekas">Kemasan Tinta Bekas</SelectItem>
                        <SelectItem value="Kain Majun Bekas">Kain Majun Bekas</SelectItem>
                        <SelectItem value="Lampu Bekas">Lampu Bekas</SelectItem>
                    </SelectContent>
                </Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="sumber" render={({ field }) => (
                <FormItem><FormLabel>Sumber Limbah</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Pilih sumber limbah..." /></SelectTrigger></FormControl>
                    <SelectContent>
                        <SelectItem value="Proses">Proses</SelectItem>
                        <SelectItem value="Operasional">Operasional</SelectItem>
                        <SelectItem value="Kantor">Kantor</SelectItem>
                    </SelectContent>
                </Select><FormMessage /></FormItem>
              )} />
              <div className="flex items-end gap-2">
                <FormField control={form.control} name="jumlah" render={({ field }) => (
                  <FormItem className="flex-grow"><FormLabel>Jumlah</FormLabel><FormControl><Input type="number" placeholder="10" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="unit" render={({ field }) => (
                  <FormItem><FormLabel>Satuan</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="Kg">Kg</SelectItem><SelectItem value="Liter">Liter</SelectItem><SelectItem value="TON">TON</SelectItem></SelectContent>
                  </Select><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="tanggalMasuk" render={({ field }) => (
                <FormItem><FormLabel>Tanggal Masuk</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="Disimpan Sementara">Disimpan Sementara</SelectItem><SelectItem value="Dikelola Pihak Ketiga">Dikelola Pihak Ketiga</SelectItem><SelectItem value="Dimanfaatkan Kembali">Dimanfaatkan Kembali</SelectItem></SelectContent>
                </Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="perlakuan" render={({ field }) => (
                <FormItem><FormLabel>Perlakuan</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                        <SelectItem value="DIHASILKAN">DIHASILKAN</SelectItem>
                        <SelectItem value="DISIMPAN DI TPS">DISIMPAN DI TPS</SelectItem>
                        <SelectItem value="DIMANFAATKAN SENDIRI">DIMANFAATKAN SENDIRI</SelectItem>
                        <SelectItem value="DIOLAH SENDIRI">DIOLAH SENDIRI</SelectItem>
                        <SelectItem value="DITIMBUN SENDIRI">DITIMBUN SENDIRI</SelectItem>
                        <SelectItem value="DISERAHKAN KEPIHAK KETIGA BERIZIN">DISERAHKAN KEPIHAK KETIGA BERIZIN</SelectItem>
                        <SelectItem value="TIDAK DIKELOLA">TIDAK DIKELOLA</SelectItem>
                    </SelectContent>
                </Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="kodeManifestasi" render={({ field }) => (
                <FormItem><FormLabel>Kode Manifestasi</FormLabel><FormControl><Input placeholder="Opsional" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="catatan" render={({ field }) => (
                <FormItem className="md:col-span-2"><FormLabel>Catatan</FormLabel><FormControl><Textarea placeholder="Informasi tambahan..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="md:col-span-2 text-right">
                <Button type="submit" disabled={form.formState.isSubmitting}>Simpan Data</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card className="max-w-5xl mx-auto mt-8">
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Daftar Limbah B3 Tersimpan</CardTitle>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={exportToExcel} disabled={!wasteData || wasteData.length === 0}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Export to Excel
                </Button>
                <Button variant="outline" size="sm" onClick={exportToPDF} disabled={!wasteData || wasteData.length === 0}>
                    <FileText className="mr-2 h-4 w-4" />
                    Export to PDF
                </Button>
            </div>
        </CardHeader>
        <CardContent>
            <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Jenis Limbah</TableHead>
                        <TableHead>Jumlah</TableHead>
                        <TableHead>Tanggal Masuk</TableHead>
                        <TableHead>Sumber</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Perlakuan</TableHead>
                        <TableHead>Kode Manifestasi</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                      Array.from({ length: 3 }).map((_, index) => (
                        <TableRow key={index}>
                          <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : wasteData && wasteData.length > 0 ? (
                      wasteData.map(limbah => (
                          <TableRow key={limbah.id}>
                              <TableCell className="font-medium">{limbah.jenis}</TableCell>
                              <TableCell>{limbah.jumlah} {limbah.unit}</TableCell>
                              <TableCell>{new Date(limbah.tanggalMasuk + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</TableCell>
                              <TableCell>{limbah.sumber}</TableCell>
                              <TableCell>{limbah.status}</TableCell>
                              <TableCell>{limbah.perlakuan}</TableCell>
                              <TableCell>{limbah.kodeManifestasi || '-'}</TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <span className="sr-only">Buka menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleOpenEditDialog(limbah)}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            <span>Edit</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setItemToDelete(limbah.id)} className="text-red-600">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            <span>Hapus</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                          </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center">Belum ada data limbah tersimpan.</TableCell>
                      </TableRow>
                    )}
                </TableBody>
            </Table>
            </div>
        </CardContent>
      </Card>

      <WasteLogbook wasteData={wasteData || []} loading={loading} />

      <WasteBalanceSheet wasteData={wasteData || []} loading={loading} />
      
      <AlertDialog open={itemToDelete !== null} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Anda yakin?</AlertDialogTitle>
                <AlertDialogDescription>
                    Tindakan ini tidak dapat dibatalkan. Ini akan menghapus data limbah secara permanen dari server.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setItemToDelete(null)}>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Hapus</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isEditOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
                <DialogTitle>Edit Data Limbah</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    <FormField control={editForm.control} name="jenis" render={({ field }) => (
                        <FormItem><FormLabel>Jenis Limbah</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Pilih jenis limbah..." /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="Oli bekas">Oli bekas</SelectItem>
                                <SelectItem value="Filter Bekas">Filter Bekas</SelectItem>
                                <SelectItem value="Accu Bekas">Accu Bekas</SelectItem>
                                <SelectItem value="Kemasan Tinta Bekas">Kemasan Tinta Bekas</SelectItem>
                                <SelectItem value="Kain Majun Bekas">Kain Majun Bekas</SelectItem>
                                <SelectItem value="Lampu Bekas">Lampu Bekas</SelectItem>
                            </SelectContent>
                        </Select><FormMessage /></FormItem>
                    )} />
                    <FormField control={editForm.control} name="sumber" render={({ field }) => (
                        <FormItem><FormLabel>Sumber Limbah</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Pilih sumber limbah..." /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="Proses">Proses</SelectItem>
                                <SelectItem value="Operasional">Operasional</SelectItem>
                                <SelectItem value="Kantor">Kantor</SelectItem>
                            </SelectContent>
                        </Select><FormMessage /></FormItem>
                    )} />
                    <div className="flex items-end gap-2">
                        <FormField control={editForm.control} name="jumlah" render={({ field }) => (
                        <FormItem className="flex-grow"><FormLabel>Jumlah</FormLabel><FormControl><Input type="number" placeholder="10" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={editForm.control} name="unit" render={({ field }) => (
                        <FormItem><FormLabel>Satuan</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent><SelectItem value="Kg">Kg</SelectItem><SelectItem value="Liter">Liter</SelectItem><SelectItem value="TON">TON</SelectItem></SelectContent>
                        </Select><FormMessage /></FormItem>
                        )} />
                    </div>
                    <FormField control={editForm.control} name="tanggalMasuk" render={({ field }) => (
                        <FormItem><FormLabel>Tanggal Masuk</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={editForm.control} name="status" render={({ field }) => (
                        <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent><SelectItem value="Disimpan Sementara">Disimpan Sementara</SelectItem><SelectItem value="Dikelola Pihak Ketiga">Dikelola Pihak Ketiga</SelectItem><SelectItem value="Dimanfaatkan Kembali">Dimanfaatkan Kembali</SelectItem></SelectContent>
                        </Select><FormMessage /></FormItem>
                    )} />
                    <FormField control={editForm.control} name="perlakuan" render={({ field }) => (
                        <FormItem><FormLabel>Perlakuan</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="DIHASILKAN">DIHASILKAN</SelectItem>
                                <SelectItem value="DISIMPAN DI TPS">DISIMPAN DI TPS</SelectItem>
                                <SelectItem value="DIMANFAATKAN SENDIRI">DIMANFAATKAN SENDIRI</SelectItem>
                                <SelectItem value="DIOLAH SENDIRI">DIOLAH SENDIRI</SelectItem>
                                <SelectItem value="DITIMBUN SENDIRI">DITIMBUN SENDIRI</SelectItem>
                                <SelectItem value="DISERAHKAN KEPIHAK KETIGA BERIZIN">DISERAHKAN KEPIHAK KETIGA BERIZIN</SelectItem>
                                <SelectItem value="TIDAK DIKELOLA">TIDAK DIKELOLA</SelectItem>
                            </SelectContent>
                        </Select><FormMessage /></FormItem>
                    )} />
                    <FormField control={editForm.control} name="kodeManifestasi" render={({ field }) => (
                        <FormItem><FormLabel>Kode Manifestasi</FormLabel><FormControl><Input placeholder="Opsional" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={editForm.control} name="catatan" render={({ field }) => (
                        <FormItem className="md:col-span-2"><FormLabel>Catatan</FormLabel><FormControl><Textarea placeholder="Informasi tambahan..." {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <DialogFooter className="md:col-span-2">
                        <Button type="submit" disabled={editForm.formState.isSubmitting}>Simpan Perubahan</Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

    