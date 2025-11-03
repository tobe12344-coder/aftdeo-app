import { Timestamp, type User as FirebaseUser } from "firebase/firestore";

export interface Employee {
  id: string;
  name: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  status: 'Present' | 'Clocked Out' | 'Absent' | 'On Leave';
  clockIn: string;
  clockOut: string;
  leaveOut: string;
  returnIn: string;
  notes: string;
}

export interface WasteData {
  id: string;
  jenis:
    | 'Oli bekas'
    | 'Filter Bekas'
    | 'Accu Bekas'
    | 'Kemasan Tinta Bekas'
    | 'Kain Majun Bekas'
    | 'Lampu Bekas';
  jumlah: number;
  unit: 'Kg' | 'Liter' | 'TON';
  tanggalMasuk: string;
  sumber: 'Proses' | 'Operasional' | 'Kantor';
  status: string;
  perlakuan: string;
  kodeManifestasi?: string;
  catatan?: string;
}

export interface Guest {
  id: string;
  name: string;
  alamat: string;
  perusahaan: string;
  yangDikunjungi: string;
  maksudKunjungan: string;
  tandaPengenal: string;
  zona: 'Bebas' | 'Terbatas' | 'Terlarang';
  signature: string;
  timestamp: Timestamp;
}

export interface SarprasItem {
  id: string;
  name: string;
  category: string;
  status: 'Baik' | 'Perlu Perbaikan' | 'Rusak';
  lastMaintenance: string;
  location: string;
}

export interface AppUser extends FirebaseUser {
  role?: 'admin' | 'employee' | 'security' | 'receptionist';
  status?: 'pending' | 'approved';
}

export interface OvertimeRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  description: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface SafetyBriefing {
  id: string;
  date: string;
  topic: string;
  conductor: string;
  attendees: string[];
  notes?: string;
  timestamp: Timestamp;
}

export interface LeavePermit {
    id: string;
    employeeId: string;
    employeeName: string;
    date: string;
    leaveTime: string;
    purpose: string;
    securityOnDuty: string;
    status: 'Pending' | 'Approved' | 'Rejected' | 'On Leave' | 'Returned' | 'Butuh Klarifikasi';
    approvedBy?: string;
    timestamp: Timestamp;
    securityOutSignature?: string;
    actualLeaveTime?: string;
    actualReturnTime?: string;
}
    
