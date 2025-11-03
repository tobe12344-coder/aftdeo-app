'use client';

import { useMemo } from 'react';
import { useMemoFirebase } from '@/firebase';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import type { AttendanceRecord, WasteData, Guest } from '@/lib/types';
import { employees } from '@/lib/data';

import AttendanceChart from './AttendanceChart';
import WasteChart from './WasteChart';
import GuestTrendChart from './GuestTrendChart';
import { Skeleton } from '../ui/skeleton';

export default function AdminDashboardClient() {
  const firestore = useFirestore();
  const todayString = new Date().toISOString().split('T')[0];

  // Queries
  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'attendance'), where('date', '==', todayString));
  }, [firestore, todayString]);

  const wasteQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'waste'));
  }, [firestore]);

  const guestQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return query(collection(firestore, 'guests'), where('timestamp', '>=', Timestamp.fromDate(sevenDaysAgo)));
  }, [firestore]);


  // Data fetching
  const { data: attendanceRecords, loading: loadingAttendance } = useCollection<AttendanceRecord>(attendanceQuery);
  const { data: wasteData, loading: loadingWaste } = useCollection<WasteData>(wasteQuery);
  const { data: guestData, loading: loadingGuests } = useCollection<Guest>(guestQuery);


  const allEmployeeRecords = useMemo(() => {
    if (loadingAttendance || !attendanceRecords) return [];
    const attendedEmployeeIds = new Set(attendanceRecords.map(r => r.employeeId));
    return employees.map(emp => {
      const record = attendanceRecords.find(r => r.employeeId === emp.id);
      return record || { employeeId: emp.id, employeeName: emp.name, status: 'Absent', date: todayString, id: emp.id, clockIn: '-', clockOut: '-', leaveOut: '-', returnIn: '-', notes: '-' };
    });
  }, [employees, attendanceRecords, loadingAttendance, todayString]);

  if (loadingAttendance || loadingWaste || loadingGuests) {
    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard Admin</h1>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-[350px]" />
                <Skeleton className="h-[350px]" />
                <Skeleton className="h-[350px]" />
            </div>
        </div>
    )
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard Admin</h1>
      <p className="text-muted-foreground">Ringkasan data operasional AFTDEO Sorong secara real-time.</p>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <AttendanceChart attendanceData={allEmployeeRecords} />
        <WasteChart wasteData={wasteData || []} />
        <GuestTrendChart guestData={guestData || []} />
      </div>
    </div>
  );
}
