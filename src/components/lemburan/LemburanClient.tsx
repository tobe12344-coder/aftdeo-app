'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState, useMemo } from 'react';
import { differenceInMinutes, format } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

import type { OvertimeRecord, Employee } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { addOvertime, updateOvertime, deleteOvertime } from '@/firebase/firestore/overtime';

import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, MoreHorizontal, Edit, Trash2, Printer } from 'lucide-react';
import { id as indonesiaLocale } from 'date-fns/locale';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Badge } from '../ui/badge';


interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

const overtimeSchema = z.object({
    employeeId: z.string().min(1, 'Pegawai wajib dipilih'),
    date: z.string().min(1, 'Tanggal wajib diisi'),
    startTime: z.string().min(1, 'Waktu mulai wajib diisi'),
    endTime: z.string().min(1, 'Waktu selesai wajib diisi'),
    description: z.string().min(1, 'Deskripsi pekerjaan wajib diisi'),
    status: z.enum(['Pending', 'Approved', 'Rejected']),
}).refine(data => data.endTime > data.startTime, {
    message: "Waktu selesai harus setelah waktu mulai",
    path: ["endTime"],
});

type OvertimeFormValues = z.infer<typeof overtimeSchema>;

interface LemburanClientProps {
  employees: Employee[];
}

export default function LemburanClient({ employees }: LemburanClientProps) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user } = useUser();
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

    const [isEditDialogOpen, setEditDialogOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<OvertimeRecord | null>(null);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    
    const memoizedEmployees = useMemo(() => employees, [employees]);

    const form = useForm<OvertimeFormValues>({
        resolver: zodResolver(overtimeSchema),
        defaultValues: {
            employeeId: '',
            date: new Date().toISOString().split('T')[0],
            startTime: '',
            endTime: '',
            description: '',
            status: 'Pending',
        },
    });

    const overtimeQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'overtime'), orderBy('date', 'desc'));
    }, [firestore]);

    const { data: overtimeRecords, loading } = useCollection<OvertimeRecord>(overtimeQuery);

    const filteredRecords = useMemo(() => {
        if (!overtimeRecords) return [];
        return overtimeRecords.filter(rec => rec.date.startsWith(selectedMonth));
    }, [overtimeRecords, selectedMonth]);

    function calculateDuration(startTime: string, endTime: string): number {
        const start = new Date(`1970-01-01T${startTime}`);
        const end = new Date(`1970-01-01T${endTime}`);
        const diff = differenceInMinutes(end, start);
        return parseFloat((diff / 60).toFixed(2));
    }

    async function onSubmit(values: OvertimeFormValues) {
        if (!firestore) return;
        
        const employee = memoizedEmployees.find(e => e.id === values.employeeId);
        if (!employee) return;

        const duration = calculateDuration(values.startTime, values.endTime);

        const record: Omit<OvertimeRecord, 'id'> = {
            ...values,
            employeeName: employee.name,
            duration,
        };

        addOvertime(firestore, record);
        
        toast({
            title: 'Berhasil',
            description: `Data lembur untuk ${employee.name} telah berhasil diajukan.`,
        });
        form.reset({
            employeeId: '',
            date: new Date().toISOString().split('T')[0],
            startTime: '',
            endTime: '',
            description: '',
            status: 'Pending',
        });
    }

    const handleOpenEditDialog = (record: OvertimeRecord) => {
        setEditingRecord(record);
        form.reset({
            ...record,
        });
        setEditDialogOpen(true);
    };

    const onEditSubmit = (values: OvertimeFormValues) => {
        if (!editingRecord?.id || !firestore) return;

        const duration = calculateDuration(values.startTime, values.endTime);
        
        const employee = memoizedEmployees.find(e => e.id === values.employeeId);
        if (!employee) return;

        const updatedRecord = { ...values, duration, employeeName: employee.name };
        
        updateOvertime(firestore, editingRecord.id, updatedRecord);

        toast({
            title: 'Berhasil',
            description: `Data lembur untuk ${values.employeeId} telah diperbarui.`
        });
        setEditDialogOpen(false);
        setEditingRecord(null);
    };

    const handleDeleteRecord = () => {
        if (!itemToDelete || !firestore) return;
        deleteOvertime(firestore, itemToDelete);
        toast({
            variant: 'destructive',
            title: 'Berhasil',
            description: 'Data lemburan telah dihapus.'
        });
        setItemToDelete(null);
    };
    
    const handlePrintRecord = (record: OvertimeRecord) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        
        // Header
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('SURAT PERINTAH KERJA LEMBUR (SPKL)', pageWidth / 2, 20, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Nomor: SPKL/${record.id.slice(0,5)}/${new Date(record.date).getMonth()+1}/${new Date(record.date).getFullYear()}`, pageWidth / 2, 26, { align: 'center' });
        
        doc.line(20, 30, pageWidth - 20, 30); // separator

        // Body
        doc.text('Yang bertanda tangan di bawah ini:', 20, 40);
        doc.autoTable({
            body: [
                ['Nama', ': AFT Manager'],
                ['Jabatan', ': Manager Operasi'],
            ],
            startY: 45,
            theme: 'plain',
            styles: { cellPadding: 1 },
        });

        const afterTableY = (doc as any).autoTable.previous.finalY;
        doc.text('Memberikan perintah kerja lembur kepada:', 20, afterTableY + 10);
        doc.autoTable({
            body: [
                ['Nama', `: ${record.employeeName}`],
                ['ID Pegawai', `: ${record.employeeId}`],
            ],
            startY: afterTableY + 15,
            theme: 'plain',
            styles: { cellPadding: 1 },
        });

        const afterTableY2 = (doc as any).autoTable.previous.finalY;
        doc.text('Untuk melaksanakan pekerjaan lembur dengan rincian sebagai berikut:', 20, afterTableY2 + 10);
        doc.autoTable({
            body: [
                ['Hari, Tanggal', `: ${format(new Date(record.date + 'T00:00:00'), "eeee, d MMMM yyyy", { locale: indonesiaLocale })}`],
                ['Waktu', `: ${record.startTime} s/d ${record.endTime}`],
                ['Durasi', `: ${record.duration.toFixed(2)} jam`],
                ['Uraian Tugas', `: ${record.description}`],
            ],
            startY: afterTableY2 + 15,
            theme: 'plain',
            styles: { cellPadding: 1, columnStyles: { 0: { cellWidth: 40 } } },
        });

        const afterTableY3 = (doc as any).autoTable.previous.finalY;
        doc.text('Demikian Surat Perintah Kerja Lembur ini dibuat untuk dapat dilaksanakan dengan sebaik-baiknya.', 20, afterTableY3 + 10);

        // Signatures
        const signatureY = afterTableY3 + 30;
        const signatureXGap = (pageWidth - 40) / 2;
        doc.text(`Sorong, ${format(new Date(record.date), "d MMMM yyyy", { locale: indonesiaLocale })}`, pageWidth - 20, signatureY, { align: 'right' });
        
        doc.text('Pekerja Lembur,', 20, signatureY + 7);
        doc.text(record.employeeName, 20, signatureY + 30);
        
        doc.text('Atasan Langsung,', 20 + signatureXGap, signatureY + 7);
        doc.text('(_________________)', 20 + signatureXGap, signatureY + 30);

        doc.text('Mengetahui,\nAFT Manager Deo Sorong', pageWidth - 20, signatureY + 7, { align: 'right' });
        doc.text('Joni Herawan', pageWidth - 20, signatureY + 30, { align: 'right' });

        doc.save(`SPKL_${record.employeeName}_${record.date}.pdf`);
    };

    const getStatusBadge = (status: OvertimeRecord['status']) => {
      switch (status) {
        case 'Approved':
          return <Badge variant="default">Disetujui</Badge>;
        case 'Pending':
          return <Badge variant="secondary">Menunggu</Badge>;
        case 'Rejected':
          return <Badge variant="destructive">Ditolak</Badge>;
        default:
          return <Badge variant="outline">Tidak Diketahui</Badge>;
      }
    };
    
    const exportToPDF = () => {
        if (!filteredRecords || filteredRecords.length === 0) {
            toast({ variant: 'destructive', title: 'Tidak ada data untuk diekspor.' });
            return;
        }
        const doc = new jsPDF() as jsPDFWithAutoTable;
        const monthName = new Date(selectedMonth + '-02').toLocaleString('id-ID', { month: 'long', year: 'numeric' });
        
        doc.setFontSize(14);
        doc.text('Laporan Rekapitulasi Lembur Pegawai', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`Periode: ${monthName}`, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });
        
        const tableData = filteredRecords.map(rec => [
            rec.employeeName,
            format(new Date(rec.date + 'T00:00:00'), "eeee, d MMM yyyy", { locale: indonesiaLocale }),
            `${rec.startTime} - ${rec.endTime}`,
            `${rec.duration} jam`,
            rec.description,
            rec.status,
        ]);

        doc.autoTable({
            head: [['Nama Pegawai', 'Tanggal', 'Waktu', 'Durasi', 'Pekerjaan', 'Status']],
            body: tableData,
            startY: 30,
            theme: 'grid',
            headStyles: { fillColor: [0, 118, 169], textColor: 255, fontStyle: 'bold' }
        });
        
        const finalY = (doc as any).autoTable.previous.finalY;
        const signatureY = finalY + 15;
        const signatureXGap = (doc.internal.pageSize.getWidth() - 40) / 2;

        doc.setFontSize(10);
        doc.text(`Sorong, ${format(new Date(), "dd MMMM yyyy", { locale: indonesiaLocale })}`, doc.internal.pageSize.getWidth() - 20, signatureY, { align: 'right' });
        
        doc.text('Yang Membuat,', 20, signatureY + 7);
        doc.text('(_________________)', 20, signatureY + 30);
        
        doc.text('Mengetahui,', 20 + signatureXGap, signatureY + 7);
        doc.text('AFT Manager Deo Sorong', 20 + signatureXGap, signatureY + 14);
        doc.text('Joni Herawan', 20 + signatureXGap, signatureY + 30);
        
        doc.text('Menyetujui,', doc.internal.pageSize.getWidth() - 20, signatureY + 7, { align: 'right' });
        doc.text('(_________________)', doc.internal.pageSize.getWidth() - 20, signatureY + 30, { align: 'right' });

        doc.save(`Laporan_Lemburan_${selectedMonth}.pdf`);
  };

  return (
    <div className="space-y-8">
        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>Formulir Pengajuan Lembur</CardTitle>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="employeeId" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nama Pegawai</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Pilih pegawai..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {memoizedEmployees.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="date" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tanggal Lembur</FormLabel>
                                <FormControl><Input type="date" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="startTime" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Waktu Mulai</FormLabel>
                                <FormControl><Input type="time" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="endTime" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Waktu Selesai</FormLabel>
                                <FormControl><Input type="time" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem className="md:col-span-2">
                                <FormLabel>Deskripsi Pekerjaan</FormLabel>
                                <FormControl><Textarea placeholder="Jelaskan pekerjaan yang dilakukan saat lembur..." {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                         {user?.role === 'admin' && (
                             <FormField control={form.control} name="status" render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                    <FormLabel>Status</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="Pending">Pending</SelectItem>
                                            <SelectItem value="Approved">Approved</SelectItem>
                                            <SelectItem value="Rejected">Rejected</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                         )}
                        <div className="md:col-span-2 text-right">
                            <Button type="submit" disabled={form.formState.isSubmitting}>Ajukan Lembur</Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>

        <Card className="max-w-6xl mx-auto">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Rekapitulasi Lembur</CardTitle>
                <div className='flex items-center gap-4'>
                    <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className='border border-gray-300 rounded-md p-2 text-sm' />
                    <Button variant="outline" size="sm" onClick={exportToPDF} disabled={!filteredRecords || filteredRecords.length === 0}>
                        <FileText className="mr-2 h-4 w-4" />
                        Export Rekap
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nama Pegawai</TableHead>
                                <TableHead>Tanggal</TableHead>
                                <TableHead>Waktu</TableHead>
                                <TableHead>Durasi</TableHead>
                                <TableHead>Pekerjaan</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className='text-right'>Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 3 }).map((_, index) => (
                                    <TableRow key={index}>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : filteredRecords && filteredRecords.length > 0 ? (
                                filteredRecords.map(rec => (
                                    <TableRow key={rec.id}>
                                        <TableCell className="font-medium">{rec.employeeName}</TableCell>
                                        <TableCell>{format(new Date(rec.date + 'T00:00:00'), "eeee, d MMM yyyy", { locale: indonesiaLocale })}</TableCell>
                                        <TableCell>{rec.startTime} - {rec.endTime}</TableCell>
                                        <TableCell>{rec.duration.toFixed(2)} jam</TableCell>
                                        <TableCell>{rec.description}</TableCell>
                                        <TableCell>{getStatusBadge(rec.status)}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Buka menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handlePrintRecord(rec)}>
                                                        <Printer className="mr-2 h-4 w-4" />
                                                        <span>Cetak SPKL</span>
                                                    </DropdownMenuItem>
                                                    {user?.role === 'admin' && (
                                                        <>
                                                        <DropdownMenuItem onClick={() => handleOpenEditDialog(rec)}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            <span>Edit</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => setItemToDelete(rec.id)} className="text-red-600">
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            <span>Hapus</span>
                                                        </DropdownMenuItem>
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center">Belum ada data lemburan untuk bulan yang dipilih.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Data Lemburan</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4">
                        <FormField control={form.control} name="employeeId" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nama Pegawai</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {memoizedEmployees.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="date" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tanggal</FormLabel>
                                <FormControl><Input type="date" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                         <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="startTime" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Waktu Mulai</FormLabel>
                                    <FormControl><Input type="time" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="endTime" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Waktu Selesai</FormLabel>
                                    <FormControl><Input type="time" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Deskripsi Pekerjaan</FormLabel>
                                <FormControl><Textarea {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="status" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Pending">Pending</SelectItem>
                                        <SelectItem value="Approved">Approved</SelectItem>
                                        <SelectItem value="Rejected">Rejected</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Batal</Button>
                            <Button type="submit">Simpan Perubahan</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={itemToDelete !== null} onOpenChange={(open) => !open && setItemToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Anda yakin?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tindakan ini tidak dapat dibatalkan. Ini akan menghapus data lemburan secara permanen.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setItemToDelete(null)}>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteRecord} className="bg-red-600 hover:bg-red-700">Hapus</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
