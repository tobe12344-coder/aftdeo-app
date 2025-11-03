'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState, useMemo, useRef }from 'react';
import { format } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';
import SignatureCanvas from 'react-signature-canvas';

import type { LeavePermit, Employee, AttendanceRecord } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { addLeavePermit, updateLeavePermitStatus, confirmReturn, addSecuritySignature } from '@/firebase/firestore/leave-permits';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { MoreHorizontal, Printer, Eraser, AlertTriangle, Signature, Check, X, MessageCircleQuestion, FileText } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

const leavePermitSchema = z.object({
    employeeId: z.string().min(1, 'Pegawai wajib dipilih'),
    date: z.string().min(1, 'Tanggal wajib diisi'),
    leaveTime: z.string().min(1, 'Waktu keluar wajib diisi'),
    securityOnDuty: z.string().min(1, 'Security jaga wajib dipilih'),
    purpose: z.string().min(1, 'Keperluan wajib diisi'),
});

type LeavePermitFormValues = z.infer<typeof leavePermitSchema>;

interface LeavePermitClientProps {
  employees: Employee[];
}

export default function LeavePermitClient({ employees }: LeavePermitClientProps) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user } = useUser();
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [currentDay, setCurrentDay] = useState('');
    
    const memoizedEmployees = useMemo(() => employees, [employees]);
    const securityPersonnel = useMemo(() => employees.filter(emp => emp.id.startsWith('T00000000')), [employees]);
    
    const [isSigning, setIsSigning] = useState(false);
    const [permitToSign, setPermitToSign] = useState<LeavePermit | null>(null);
    const sigPadRef = useRef<SignatureCanvas>(null);

    const form = useForm<LeavePermitFormValues>({
        resolver: zodResolver(leavePermitSchema),
        defaultValues: {
            employeeId: '',
            date: new Date().toISOString().split('T')[0],
            leaveTime: '',
            securityOnDuty: '',
            purpose: '',
        },
    });

    const watchedDate = form.watch('date');
    const watchedEmployeeId = form.watch('employeeId');

    // Check attendance for selected employee and date
    const attendanceQuery = useMemoFirebase(() => {
        if (!firestore || !watchedEmployeeId || !watchedDate) return null;
        return query(
            collection(firestore, 'attendance'),
            where('employeeId', '==', watchedEmployeeId),
            where('date', '==', watchedDate)
        );
    }, [firestore, watchedEmployeeId, watchedDate]);

    const { data: attendanceData, loading: loadingAttendance } = useCollection<AttendanceRecord>(attendanceQuery);

    const hasClockedIn = useMemo(() => {
        if (!attendanceData || attendanceData.length === 0) return false;
        const record = attendanceData[0];
        return record.status === 'Present' || record.status === 'Clocked Out' || record.status === 'On Leave';
    }, [attendanceData]);

    const canSubmitPermit = hasClockedIn || loadingAttendance;


    useState(() => {
        if (watchedDate) {
            try {
                const dayName = format(new Date(watchedDate + 'T00:00:00'), 'eeee', { locale: indonesiaLocale });
                setCurrentDay(dayName);
            } catch (e) {
                setCurrentDay('');
            }
        }
    }, [watchedDate]);

    const permitsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'leave-permits'), orderBy('timestamp', 'desc'));
    }, [firestore]);

    const { data: permitRecords, loading } = useCollection<LeavePermit>(permitsQuery);

    const filteredRecords = useMemo(() => {
        if (!permitRecords) return [];
        return permitRecords.filter(rec => rec.date.startsWith(selectedMonth));
    }, [permitRecords, selectedMonth]);
    
    const signOutQueue = useMemo(() => {
        if (!permitRecords) return [];
        return permitRecords.filter(rec => rec.status === 'Approved');
    }, [permitRecords]);

    const signInQueue = useMemo(() => {
        if (!permitRecords) return [];
        return permitRecords.filter(rec => rec.status === 'On Leave');
    }, [permitRecords]);
    
    const adminQueue = useMemo(() => {
        if (!permitRecords) return [];
        return permitRecords.filter(rec => rec.status === 'Pending' || rec.status === 'Butuh Klarifikasi');
    }, [permitRecords]);

    async function onSubmit(values: LeavePermitFormValues) {
        if (!firestore) return;
        
        const employee = memoizedEmployees.find(e => e.id === values.employeeId);
        if (!employee) return;

        addLeavePermit(firestore, { ...values, employeeName: employee.name });
        
        toast({
            title: 'Berhasil',
            description: `Pengajuan izin keluar untuk ${employee.name} telah berhasil dibuat.`,
        });
        form.reset({
            employeeId: '',
            date: new Date().toISOString().split('T')[0],
            leaveTime: '',
            securityOnDuty: '',
            purpose: '',
        });
    }

    const handleStatusUpdate = (id: string, status: 'Approved' | 'Rejected' | 'Butuh Klarifikasi') => {
        if (!firestore || !user?.displayName) return;
        updateLeavePermitStatus(firestore, id, status, user.displayName);
        toast({
            title: 'Status Diperbarui',
            description: `Status izin telah diubah menjadi ${status}.`
        });
    };
    
    const handleSignClick = (permit: LeavePermit) => {
        setPermitToSign(permit);
        setIsSigning(true);
    };

    const handleConfirmSignature = () => {
        if (!permitToSign || !firestore || sigPadRef.current?.isEmpty()) {
            toast({ variant: 'destructive', title: 'Tanda Tangan Wajib Diisi' });
            return;
        }

        const signature = sigPadRef.current.toDataURL('image/png');
        const actualLeaveTime = format(new Date(), 'HH:mm');
        addSecuritySignature(firestore, permitToSign.id, signature, actualLeaveTime);
        toast({
            title: 'Berhasil',
            description: `${permitToSign.employeeName} telah dikonfirmasi keluar.`
        });

        setIsSigning(false);
        setPermitToSign(null);
    };
    
    const handleConfirmReturn = (permit: LeavePermit) => {
        if (!firestore) return;
        const actualReturnTime = format(new Date(), 'HH:mm');
        confirmReturn(firestore, permit.id, actualReturnTime);
        toast({
            title: 'Berhasil',
            description: `${permit.employeeName} telah dikonfirmasi kembali ke area kerja.`
        });
    };

    const handlePrintPermit = (record: LeavePermit) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Header
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('PT. PERTAMINA PATRA NIAGA', 20, 20);
        doc.text('REGIONAL PAPUA MALUKU', 20, 25);
        doc.text('AFT DEO SORONG', 20, 30);
        
        // Pertamina Logo Placeholder
        doc.setFontSize(12);
        doc.setTextColor(0, 83, 162); 
        doc.text('PERTAMINA', pageWidth - 50, 25);
        doc.setTextColor(0, 0, 0);

        // Title
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('SURAT IZIN MENINGGALKAN KANTOR', pageWidth / 2, 45, { align: 'center' });
        doc.setLineWidth(0.5);
        doc.line(pageWidth / 2 - 40, 46, pageWidth / 2 + 40, 46);

        // Body
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const bodyYStart = 60;
        const bodyLineHeight = 8;
        doc.text('Nama', 20, bodyYStart);
        doc.text(':', 60, bodyYStart);
        doc.text(record.employeeName, 62, bodyYStart);

        doc.text('Hari, Tanggal', 20, bodyYStart + bodyLineHeight);
        doc.text(':', 60, bodyYStart + bodyLineHeight);
        doc.text(format(new Date(record.date + 'T00:00:00'), 'eeee, dd MMMM yyyy', { locale: indonesiaLocale }), 62, bodyYStart + bodyLineHeight);

        doc.text('Waktu Pergi', 20, bodyYStart + bodyLineHeight * 2);
        doc.text(':', 60, bodyYStart + bodyLineHeight * 2);
        doc.text(record.leaveTime + ' WIT', 62, bodyYStart + bodyLineHeight * 2);
        
        doc.text('Keperluan', 20, bodyYStart + bodyLineHeight * 3);
        doc.text(':', 60, bodyYStart + bodyLineHeight * 3);
        doc.text(record.purpose, 62, bodyYStart + bodyLineHeight * 3);

        // Signature Section
        const sigYStart = bodyYStart + bodyLineHeight * 5;
        doc.text('Yang Mengajukan,', 20, sigYStart);
        doc.text(record.employeeName, 20, sigYStart + 20);
        doc.line(20, sigYStart + 21, 60, sigYStart + 21);

        doc.text('Security Jaga,', pageWidth - 60, sigYStart);
        doc.text(record.securityOnDuty, pageWidth-60, sigYStart + 20);
        doc.line(pageWidth - 60, sigYStart + 21, pageWidth - 20, sigYStart + 21);
        
        doc.text('Mengetahui,', pageWidth / 2, sigYStart + 30, { align: 'center' });
        doc.text('AFT MANAGER DEO SORONG', pageWidth / 2, sigYStart + 35, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.text('JONI HERAWAN', pageWidth / 2, sigYStart + 55, { align: 'center' });
        doc.line(pageWidth/2 - 25, sigYStart + 56, pageWidth/2 + 25, sigYStart + 56);
        doc.setFont('helvetica', 'normal');
        
        // Monitor Security Section
        const monitorYStart = sigYStart + 70;
        (doc as any).autoTable({
            theme: 'grid',
            startY: monitorYStart,
            head: [['MONITOR SECURITY', 'Waktu', 'Paraf']],
            body: [
                ['JAM KELUAR      :', '................... WIT', ''],
                ['JAM KEMBALI    :', '................... WIT', '']
            ],
            styles: {
                lineWidth: 0.1,
                lineColor: [0, 0, 0],
            },
            headStyles: {
                fillColor: [220, 220, 220],
                textColor: [0,0,0],
                fontStyle: 'bold',
            }
        });

        doc.save(`Surat_Izin_Keluar_${record.employeeName}_${record.date}.pdf`);
    };

    const getStatusBadge = (status: LeavePermit['status']) => {
      switch (status) {
        case 'Approved':
          return <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">Disetujui</Badge>;
        case 'Pending':
          return <Badge variant="secondary">Menunggu</Badge>;
        case 'Rejected':
          return <Badge variant="destructive">Ditolak</Badge>;
        case 'On Leave':
          return <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">Keluar Area</Badge>;
        case 'Returned':
          return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Telah Kembali</Badge>;
        case 'Butuh Klarifikasi':
            return <Badge variant="default" className="bg-purple-500 hover:bg-purple-600">Butuh Klarifikasi</Badge>;
        default:
          return <Badge variant="outline">Tidak Diketahui</Badge>;
      }
    };
    
    const exportToPDF = () => {
        if (!filteredRecords || filteredRecords.length === 0) {
            toast({ variant: 'destructive', title: 'Tidak ada data untuk diekspor.' });
            return;
        }
        const doc = new jsPDF('landscape') as jsPDFWithAutoTable;
        const monthName = new Date(selectedMonth + '-02').toLocaleString('id-ID', { month: 'long', year: 'numeric' });
        
        doc.setFontSize(14);
        doc.text('Laporan Rekapitulasi Izin Keluar', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`Periode: ${monthName}`, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });
        
        const tableData = filteredRecords.map(rec => [
            rec.employeeName,
            format(new Date(rec.date + 'T00:00:00'), "eeee, d MMM yyyy", { locale: indonesiaLocale }),
            rec.actualLeaveTime || rec.leaveTime,
            rec.actualReturnTime || '-',
            rec.purpose,
            rec.status,
        ]);

        doc.autoTable({
            head: [['Nama Pegawai', 'Tanggal', 'Waktu Keluar', 'Waktu Kembali', 'Keperluan', 'Status']],
            body: tableData,
            startY: 30,
            theme: 'grid',
            headStyles: { fillColor: [0, 118, 169], textColor: 255, fontStyle: 'bold' }
        });
        
        const finalY = (doc as any).autoTable.previous.finalY;
        const signatureY = finalY + 15;
        
        doc.setFontSize(10);
        doc.text(`Sorong, ${format(new Date(), "dd MMMM yyyy", { locale: indonesiaLocale })}`, doc.internal.pageSize.getWidth() - 20, signatureY, { align: 'right' });
        
        doc.text('Mengetahui,', doc.internal.pageSize.getWidth() - 20, signatureY + 7, { align: 'right' });
        doc.text('AFT Manager Deo Sorong', doc.internal.pageSize.getWidth() - 20, signatureY + 14, { align: 'right' });
        doc.text('Joni Herawan', doc.internal.pageSize.getWidth() - 20, signatureY + 30, { align: 'right' });

        doc.save(`Laporan_Izin_Keluar_${selectedMonth}.pdf`);
    };

    return (
        <div className="space-y-8">
            {user?.role === 'admin' ? (
                <Card className="max-w-6xl mx-auto">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="text-blue-500" />
                            Antrian Persetujuan Izin Keluar
                        </CardTitle>
                        <CardDescription>Daftar pengajuan izin yang menunggu persetujuan atau klarifikasi Anda.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Nama Pegawai</TableHead>
                                    <TableHead>Tanggal & Waktu</TableHead>
                                    <TableHead>Keperluan</TableHead>
                                    <TableHead className='text-right'>Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={5}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                                ) : adminQueue.length > 0 ? (
                                    adminQueue.map(rec => (
                                        <TableRow key={rec.id}>
                                            <TableCell>{getStatusBadge(rec.status)}</TableCell>
                                            <TableCell>{rec.employeeName}</TableCell>
                                            <TableCell>{format(new Date(rec.date + 'T00:00:00'), "d MMM yyyy", { locale: indonesiaLocale })} @ {rec.leaveTime}</TableCell>
                                            <TableCell className="max-w-xs truncate">{rec.purpose}</TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => handleStatusUpdate(rec.id, 'Approved')}>
                                                    <Check className="mr-2 h-4 w-4" />
                                                    Setujui
                                                </Button>
                                                <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleStatusUpdate(rec.id, 'Rejected')}>
                                                    <X className="mr-2 h-4 w-4" />
                                                    Tolak
                                                </Button>
                                                 <Button size="sm" variant="outline" className="text-purple-600 border-purple-600 hover:bg-purple-50 hover:text-purple-700" onClick={() => handleStatusUpdate(rec.id, 'Butuh Klarifikasi')}>
                                                    <MessageCircleQuestion className="mr-2 h-4 w-4" />
                                                    Klarifikasi
                                                 </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center">Tidak ada pengajuan izin yang menunggu persetujuan.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ) : user?.role !== 'security' ? (
                <Card className="max-w-4xl mx-auto">
                    <CardHeader>
                        <CardTitle>Formulir Izin Keluar Area Kerja</CardTitle>
                        <CardDescription>Isi formulir di bawah ini untuk mengajukan izin keluar dari lingkungan kerja pada jam dinas.</CardDescription>
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
                                        <FormLabel>Tanggal Izin ({currentDay})</FormLabel>
                                        <FormControl><Input type="date" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="leaveTime" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Waktu Keluar</FormLabel>
                                        <FormControl><Input type="time" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                 <FormField control={form.control} name="securityOnDuty" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Security Jaga</FormLabel>
                                         <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Pilih security..." /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {securityPersonnel.map(sec => <SelectItem key={sec.id} value={sec.name}>{sec.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="purpose" render={({ field }) => (
                                    <FormItem className="md:col-span-2">
                                        <FormLabel>Keperluan</FormLabel>
                                        <FormControl><Textarea placeholder="Jelaskan keperluan Anda secara singkat..." {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <div className="md:col-span-2 text-right">
                                    <Button type="submit" disabled={!canSubmitPermit || form.formState.isSubmitting}>Ajukan Izin</Button>
                                     {watchedEmployeeId && !loadingAttendance && !hasClockedIn && (
                                        <p className="text-sm text-destructive mt-2 text-left">
                                            Pegawai harus absen masuk terlebih dahulu sebelum dapat mengajukan izin keluar.
                                        </p>
                                    )}
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            ) : null}
            
            {user?.role === 'security' && (
                <>
                <Card className="max-w-6xl mx-auto">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="text-yellow-500" />
                            Antrian Izin Keluar (Menunggu TTD Keluar)
                        </CardTitle>
                        <CardDescription>Daftar pegawai yang telah disetujui izinnya dan menunggu konfirmasi keluar oleh security.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nama Pegawai</TableHead>
                                    <TableHead>Waktu Pengajuan</TableHead>
                                    <TableHead>Keperluan</TableHead>
                                    <TableHead>Disetujui Oleh</TableHead>
                                    <TableHead className='text-right'>Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={5}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                                ) : signOutQueue.length > 0 ? (
                                    signOutQueue.map(rec => (
                                        <TableRow key={rec.id}>
                                            <TableCell>{rec.employeeName}</TableCell>
                                            <TableCell>{rec.leaveTime}</TableCell>
                                            <TableCell>{rec.purpose}</TableCell>
                                            <TableCell>{rec.approvedBy}</TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" onClick={() => handleSignClick(rec)}>
                                                    <Signature className="mr-2 h-4 w-4" />
                                                    Konfirmasi Keluar
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center">Tidak ada antrian.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <Card className="max-w-6xl mx-auto">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="text-blue-500" />
                            Antrian Pegawai Keluar Area (Menunggu Konfirmasi Kembali)
                        </CardTitle>
                        <CardDescription>Daftar pegawai yang sedang berada di luar area dan menunggu konfirmasi kembali.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nama Pegawai</TableHead>
                                    <TableHead>Waktu Keluar Aktual</TableHead>
                                    <TableHead>Keperluan</TableHead>
                                    <TableHead className='text-right'>Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                                ) : signInQueue.length > 0 ? (
                                    signInQueue.map(rec => (
                                        <TableRow key={rec.id}>
                                            <TableCell>{rec.employeeName}</TableCell>
                                            <TableCell>{rec.actualLeaveTime}</TableCell>
                                            <TableCell>{rec.purpose}</TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="secondary" onClick={() => handleConfirmReturn(rec)}>
                                                    <Check className="mr-2 h-4 w-4" />
                                                    Konfirmasi Kembali
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center">Tidak ada pegawai di luar area.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                </>
            )}

            <Card className="max-w-6xl mx-auto">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Rekapitulasi Izin Keluar</CardTitle>
                    <div className='flex items-center gap-4'>
                        <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className='border border-gray-300 rounded-md p-2 text-sm' />
                        <Button variant="outline" size="sm" onClick={exportToPDF} disabled={!filteredRecords || filteredRecords.length === 0}>
                            <FileText className="mr-2 h-4 w-4" />
                            Cetak Rekap
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
                                    <TableHead>Waktu Keluar (Aktual)</TableHead>
                                    <TableHead>Waktu Kembali (Aktual)</TableHead>
                                    <TableHead>Keperluan</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>TTD Keluar</TableHead>
                                    <TableHead className='text-right'>Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 3 }).map((_, index) => (
                                        <TableRow key={index}>
                                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-10 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : filteredRecords && filteredRecords.length > 0 ? (
                                    filteredRecords.map(rec => (
                                        <TableRow key={rec.id}>
                                            <TableCell className="font-medium">{rec.employeeName}</TableCell>
                                            <TableCell>{format(new Date(rec.date + 'T00:00:00'), "d MMM yyyy", { locale: indonesiaLocale })}</TableCell>
                                            <TableCell>{rec.actualLeaveTime || rec.leaveTime}</TableCell>
                                            <TableCell>{rec.actualReturnTime || '-'}</TableCell>
                                            <TableCell className="max-w-[150px] truncate">{rec.purpose}</TableCell>
                                            <TableCell>{getStatusBadge(rec.status)}</TableCell>
                                            <TableCell>
                                                {rec.securityOutSignature ? <img src={rec.securityOutSignature} alt="ttd keluar" className="h-10 w-20 object-contain bg-gray-100 rounded-sm" /> : '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Buka menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handlePrintPermit(rec)} disabled={rec.status === 'Pending' || rec.status === 'Rejected'}>
                                                            <Printer className="mr-2 h-4 w-4" />
                                                            <span>Cetak Surat Izin</span>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center">Belum ada data izin untuk bulan yang dipilih.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isSigning} onOpenChange={setIsSigning}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Konfirmasi Izin Keluar: {permitToSign?.employeeName}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                       <p>Pegawai atas nama {permitToSign?.employeeName} telah disetujui untuk keluar. Mohon bubuhkan tanda tangan untuk mengonfirmasi pegawai telah melapor dan meninggalkan area kerja.</p>
                        <div className="relative w-full h-48 rounded-md border border-input bg-background">
                            <SignatureCanvas
                              ref={sigPadRef}
                              penColor='black'
                              canvasProps={{ className: 'w-full h-full' }}
                            />
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => sigPadRef.current?.clear()}
                        >
                            <Eraser className="mr-2 h-4 w-4" />
                            Hapus Tanda Tangan
                        </Button>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSigning(false)}>Batal</Button>
                        <Button onClick={handleConfirmSignature}>Konfirmasi &amp; Simpan</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
