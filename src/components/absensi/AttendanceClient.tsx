'use client';

import { useState, useEffect, useMemo } from 'react';
import type { AttendanceRecord, Employee, LeavePermit } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Input } from '../ui/input';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, type CollectionReference } from 'firebase/firestore';
import { handleAttendanceAction, updateAttendance } from '@/firebase/firestore/attendance';
import { Skeleton } from '../ui/skeleton';
import { FileText, QrCode, Calendar as CalendarIcon, MoreHorizontal, Edit } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import BarcodeScanner from '../common/BarcodeScanner';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format, parse } from 'date-fns';
import { id } from 'date-fns/locale';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';

// Extend jsPDF to include autoTable
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

interface AttendanceClientProps {
  employees: Employee[];
}

export default function AttendanceClient({ employees }: AttendanceClientProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const selectedDateString = useMemo(() => selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '', [selectedDate]);

  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [keterangan, setKeterangan] = useState('');
  const [isScannerOpen, setScannerOpen] = useState(false);
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);

  const memoizedEmployees = useMemo(() => employees, [employees]);

  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore || !selectedDateString) return null;
    const attendanceCollection = collection(firestore, 'attendance') as CollectionReference<AttendanceRecord>;
    return query(attendanceCollection, where('date', '==', selectedDateString));
  }, [firestore, selectedDateString]);

  const { data: attendanceRecords, loading: loadingAttendance } = useCollection<AttendanceRecord>(attendanceQuery);
  
  const onLeavePermitsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedEmployee) return null;
    // Query for permits for the selected employee that are currently 'On Leave'
    return query(
      collection(firestore, 'leave-permits') as CollectionReference<LeavePermit>, 
      where('employeeId', '==', selectedEmployee),
      where('status', '==', 'On Leave')
    );
  }, [firestore, selectedEmployee]);

  const { data: onLeavePermits } = useCollection<LeavePermit>(onLeavePermitsQuery);
  const isEmployeeOnLeave = useMemo(() => (onLeavePermits?.length ?? 0) > 0, [onLeavePermits]);
  
  // Button disabled states
  const [isClockInDisabled, setClockInDisabled] = useState(true);
  const [isClockOutDisabled, setClockOutDisabled] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
      setCurrentDate(now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selectedEmployee) {
      setClockInDisabled(true);
      setClockOutDisabled(true);
      return;
    }
    
    const isToday = selectedDateString === format(new Date(), 'yyyy-MM-dd');

    // Attendance actions are only enabled if the selected date is today.
    if (!isToday) {
      setClockInDisabled(true);
      setClockOutDisabled(true);
      return;
    }

    const record = attendanceRecords?.find(r => r.employeeId === selectedEmployee);

    if (record) {
      const hasClockedIn = record.clockIn && record.clockIn !== '-';
      const hasClockedOut = record.clockOut && record.clockOut !== '-';

      setClockInDisabled(hasClockedIn || hasClockedOut);
      // Disable clock out if not clocked in, already clocked out, OR if the employee is currently on leave
      setClockOutDisabled(!hasClockedIn || hasClockedOut || isEmployeeOnLeave);
    } else {
      // If no record exists for the selected employee for today
      setClockInDisabled(false); // Can clock in
      setClockOutDisabled(true);
    }
  }, [selectedEmployee, attendanceRecords, selectedDateString, isEmployeeOnLeave]);

  const handleBarcodeScan = (scannedId: string) => {
    const employeeExists = memoizedEmployees.some(emp => emp.id === scannedId);
    if (employeeExists) {
        setSelectedEmployee(scannedId);
        toast({
            title: 'Pegawai Ditemukan',
            description: `Pegawai dengan ID ${scannedId} berhasil dipilih.`,
        });
    } else {
        toast({
            variant: 'destructive',
            title: 'Pegawai Tidak Ditemukan',
            description: `ID ${scannedId} tidak cocok dengan pegawai manapun.`,
        });
    }
  };
  
  const calculateDuration = (startTime: string, endTime: string) => {
    if (!startTime || startTime === '-' || !endTime || endTime === '-') return 0;
    try {
      const start = parse(startTime, 'HH:mm', new Date());
      const end = parse(endTime, 'HH:mm', new Date());
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
      const diff = end.getTime() - start.getTime();
      return diff / (1000 * 60 * 60); // difference in hours
    } catch (error) {
      console.error("Error parsing time:", error);
      return 0;
    }
  };

  const handleAttendance = async (type: 'clockIn' | 'clockOut') => {
    if (!selectedEmployee || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Gagal Merekam Absensi',
        description: 'Silakan pilih nama pegawai terlebih dahulu.',
      });
      return;
    }

    // Ensure attendance actions only happen for today
    const isToday = selectedDateString === format(new Date(), 'yyyy-MM-dd');
    if (!isToday) {
        toast({
            variant: 'destructive',
            title: 'Aksi Tidak Diizinkan',
            description: 'Absensi hanya dapat direkam untuk hari ini.',
        });
        return;
    }
    
    const employee = memoizedEmployees.find(e => e.id === selectedEmployee);
    if (!employee) return;

    const now = new Date();
    const timeString = format(now, 'HH:mm');
    const dateString = format(now, 'yyyy-MM-dd'); // Use current date for the record

    const record = attendanceRecords?.find(r => r.employeeId === selectedEmployee);

    if (type === 'clockOut' && record?.clockIn) {
        const duration = calculateDuration(record.clockIn, timeString);
        if (duration > 8 && !keterangan) {
            toast({
                variant: 'destructive',
                title: 'Diperlukan Keterangan Lembur',
                description: 'Jam kerja lebih dari 8 jam. Mohon isi keterangan lembur.',
            });
            return;
        }
    }

    await handleAttendanceAction(firestore, type, employee, dateString, timeString, keterangan, record);

    let description = '';
    switch (type) {
        case 'clockIn': description = `Absen masuk untuk ${employee.name} berhasil direkam pada jam ${timeString}.`; break;
        case 'clockOut': description = `Absen pulang untuk ${employee.name} berhasil direkam pada jam ${timeString}.`; break;
    }
    
    toast({
        title: 'Absensi Berhasil',
        description: description,
    });
    setKeterangan(''); // Clear keterangan field
  };
  
  const handleEditRecord = (record: AttendanceRecord) => {
    setEditingRecord(record);
    setIsEditDialogOpen(true);
  };
  
  const handleSaveEdit = () => {
    if (!editingRecord || !firestore) return;

    // Create a mutable copy
    const updatedRecord = { ...editingRecord };
    
    // Replace '-' with empty string for time inputs to avoid validation errors with time input type
    const cleanTime = (timeStr: string) => timeStr === '-' ? '' : timeStr;

    updatedRecord.clockIn = cleanTime(updatedRecord.clockIn);
    updatedRecord.clockOut = cleanTime(updatedRecord.clockOut);
    updatedRecord.leaveOut = cleanTime(updatedRecord.leaveOut);
    updatedRecord.returnIn = cleanTime(updatedRecord.returnIn);

    const dataToUpdate: Partial<AttendanceRecord> = {
        clockIn: updatedRecord.clockIn || '-',
        clockOut: updatedRecord.clockOut || '-',
        leaveOut: updatedRecord.leaveOut || '-',
        returnIn: updatedRecord.returnIn || '-',
        notes: updatedRecord.notes === '-' ? '' : updatedRecord.notes,
        status: updatedRecord.status // Keep the original status by default
    };

    // Automatically update status based on time inputs
    if (dataToUpdate.clockOut && dataToUpdate.clockOut !== '-') {
        dataToUpdate.status = 'Clocked Out';
    } else if (dataToUpdate.leaveOut && dataToUpdate.leaveOut !== '-' && (!dataToUpdate.returnIn || dataToUpdate.returnIn === '-')) {
        dataToUpdate.status = 'On Leave';
    } else if (dataToUpdate.clockIn && dataToUpdate.clockIn !== '-') {
        dataToUpdate.status = 'Present';
    }


    updateAttendance(firestore, editingRecord.id, dataToUpdate);
    toast({
        title: 'Berhasil',
        description: `Data absensi untuk ${editingRecord.employeeName} telah diperbarui.`
    });
    setIsEditDialogOpen(false);
    setEditingRecord(null);
  };

  const getStatusBadge = (status: AttendanceRecord['status']) => {
    switch (status) {
      case 'Present':
        return <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">Hadir</span>;
      case 'On Leave':
        return <span className="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded-full">Sedang Izin</span>;
      case 'Clocked Out':
        return <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full">Sudah Pulang</span>;
      case 'Absent':
        return <span className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 rounded-full">Belum Hadir</span>;
      default:
        return null;
    }
  };
  
  const allEmployeeRecords = useMemo(() => {
    if (loadingAttendance) return [];
    return memoizedEmployees.map(emp => {
      const record = attendanceRecords?.find(r => r.employeeId === emp.id);
      return record || {
        id: emp.id,
        employeeId: emp.id,
        employeeName: emp.name,
        date: selectedDateString,
        status: 'Absent',
        clockIn: '-',
        clockOut: '-',
        leaveOut: '-',
        returnIn: '-',
        notes: '-'
      }
    });
  }, [memoizedEmployees, attendanceRecords, loadingAttendance, selectedDateString]);

  const exportToPDF = () => {
    if (!allEmployeeRecords || allEmployeeRecords.length === 0 || !selectedDate) {
        toast({ variant: 'destructive', title: 'Tidak ada data untuk diekspor.' });
        return;
    }
    const doc = new jsPDF() as jsPDFWithAutoTable;
    const formattedDate = format(selectedDate, "eeee, dd MMMM yyyy", { locale: id });
    const exportDateString = format(selectedDate, "yyyy-MM-dd");
    
    doc.setFontSize(14);
    doc.text('Laporan Absensi Harian', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text(formattedDate, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });
    
    const tableData = allEmployeeRecords.map(rec => [
        rec.employeeName,
        rec.status,
        rec.clockIn,
        rec.leaveOut,
        rec.returnIn,
        rec.clockOut,
        rec.notes,
    ]);

    doc.autoTable({
        head: [['Nama Pegawai', 'Status', 'Masuk', 'Izin Keluar', 'Kembali', 'Pulang', 'Keterangan']],
        body: tableData,
        startY: 30,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: { fillColor: [0, 118, 169], textColor: 255, fontStyle: 'bold' } // Pertamina Blue
    });
    
    const finalY = doc.autoTable.previous.finalY;
    doc.setFontSize(10);
    doc.text(`Sorong, ${format(new Date(), "dd MMMM yyyy", { locale: id })}`, doc.internal.pageSize.getWidth() - 20, finalY + 15, { align: 'right' });
    doc.text('Mengetahui,', doc.internal.pageSize.getWidth() - 20, finalY + 22, { align: 'right' });
    doc.text('AFT Manager Deo Sorong', doc.internal.pageSize.getWidth() - 20, finalY + 29, { align: 'right' });

    // Signature space
    doc.text('Joni Herawan', doc.internal.pageSize.getWidth() - 20, finalY + 50, { align: 'right' });

    doc.save(`Laporan_Absensi_${exportDateString}.pdf`);
  };

  return (
    <>
      <BarcodeScanner open={isScannerOpen} onOpenChange={setScannerOpen} onScan={handleBarcodeScan} />
      <Card className="max-w-6xl mx-auto">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-gray-800">Modul Absensi Pegawai</CardTitle>
          <div className="text-center my-4">
            <p className="text-lg text-gray-600">{currentDate || 'Memuat tanggal...'}</p>
            <p className="text-5xl font-bold text-gray-900 tracking-wider">{currentTime || 'Memuat jam...'}</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="my-6 p-4 border rounded-lg bg-gray-50">
            <h3 className="font-semibold text-lg mb-3 text-gray-700">Catat Kehadiran (Hanya untuk hari ini)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="w-full">
                    <Label htmlFor="employee-select">Pilih Pegawai</Label>
                    <div className="flex gap-2">
                        <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                            <SelectTrigger id="employee-select">
                                <SelectValue placeholder="Pilih nama pegawai..." />
                            </SelectTrigger>
                            <SelectContent>
                                {memoizedEmployees.map(emp => (
                                <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" onClick={() => setScannerOpen(true)} aria-label="Scan Barcode">
                            <QrCode className="h-5 w-5"/>
                        </Button>
                    </div>
                </div>
                <div className="flex-grow w-full">
                    <Label htmlFor="keterangan">Keterangan Lembur</Label>
                    <Input id="keterangan" placeholder="Isi jika jam kerja > 8 jam..." value={keterangan} onChange={e => setKeterangan(e.target.value)} />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
                <Button onClick={() => handleAttendance('clockIn')} disabled={isClockInDisabled} className="bg-green-500 hover:bg-green-600 text-base">Masuk</Button>
                <Button onClick={() => handleAttendance('clockOut')} disabled={isClockOutDisabled} className="bg-red-500 hover:bg-red-600 text-base">Pulang</Button>
            </div>
             {isEmployeeOnLeave && user?.role !== 'admin' && (
                <p className="text-sm text-yellow-600 mt-3 text-center">
                    Tidak dapat absen pulang. Pegawai masih tercatat "On Leave" di modul Izin Keluar.
                </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-6xl mx-auto mt-8">
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-gray-800">Status Absensi</CardTitle>
              <p className="text-sm text-muted-foreground">
                Menampilkan data untuk tanggal: {selectedDate ? format(selectedDate, "dd MMMM yyyy", { locale: id }) : '...' }
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Popover>
                  <PopoverTrigger asChild>
                      <Button
                          variant={"outline"}
                          className={"w-[240px] justify-start text-left font-normal"}
                      >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          initialFocus
                          disabled={(date) => date > new Date() || date < new Date("2020-01-01")}
                      />
                  </PopoverContent>
              </Popover>
              <Button variant="outline" size="sm" onClick={exportToPDF} disabled={loadingAttendance || allEmployeeRecords.length === 0}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export Laporan
              </Button>
            </div>
        </CardHeader>
        <CardContent>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className='min-w-[150px]'>Nama Pegawai</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Jam Masuk</TableHead>
                            <TableHead>Jam Keluar Izin</TableHead>
                            <TableHead>Jam Kembali Izin</TableHead>
                            <TableHead>Jam Pulang</TableHead>
                            <TableHead className='min-w-[200px]'>Keterangan</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loadingAttendance ? (
                           Array.from({ length: memoizedEmployees.length }).map((_, index) => (
                            <TableRow key={index}>
                                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                            </TableRow>
                           ))
                        ) : allEmployeeRecords.length > 0 ? allEmployeeRecords.map((record) => (
                            <TableRow key={record.id}>
                                <TableCell className="font-medium">{record.employeeName}</TableCell>
                                <TableCell>{getStatusBadge(record.status)}</TableCell>
                                <TableCell>{record.clockIn}</TableCell>
                                <TableCell>{record.leaveOut}</TableCell>
                                <TableCell>{record.returnIn}</TableCell>
                                <TableCell>{record.clockOut}</TableCell>
                                <TableCell>{record.notes}</TableCell>
                                <TableCell className="text-right">
                                    {(record.status !== 'Absent' && user?.role === 'admin') && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Buka menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEditRecord(record)}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    <span>Edit</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center">Belum ada data absensi untuk tanggal yang dipilih.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Edit Catatan Absensi</DialogTitle>
              </DialogHeader>
              {editingRecord && (
                  <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="edit-name" className="text-right">Nama</Label>
                          <Input id="edit-name" value={editingRecord.employeeName} disabled className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="edit-clockIn" className="text-right">Masuk</Label>
                          <Input id="edit-clockIn" type="time" value={editingRecord.clockIn === '-' ? '' : editingRecord.clockIn} onChange={(e) => setEditingRecord({...editingRecord, clockIn: e.target.value })} className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="edit-leaveOut" className="text-right">Izin Keluar</Label>
                          <Input id="edit-leaveOut" type="time" value={editingRecord.leaveOut === '-' ? '' : editingRecord.leaveOut} onChange={(e) => setEditingRecord({...editingRecord, leaveOut: e.target.value })} className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="edit-returnIn" className="text-right">Kembali</Label>
                          <Input id="edit-returnIn" type="time" value={editingRecord.returnIn === '-' ? '' : editingRecord.returnIn} onChange={(e) => setEditingRecord({...editingRecord, returnIn: e.target.value })} className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="edit-clockOut" className="text-right">Pulang</Label>
                          <Input id="edit-clockOut" type="time" value={editingRecord.clockOut === '-' ? '' : editingRecord.clockOut} onChange={(e) => setEditingRecord({...editingRecord, clockOut: e.target.value })} className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="edit-notes" className="text-right">Keterangan</Label>
                          <Input id="edit-notes" value={editingRecord.notes === '-' ? '' : editingRecord.notes} onChange={(e) => setEditingRecord({...editingRecord, notes: e.target.value })} className="col-span-3" />
                      </div>
                  </div>
              )}
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Batal</Button>
                  <Button onClick={handleSaveEdit}>Simpan Perubahan</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </>
  );
}

    