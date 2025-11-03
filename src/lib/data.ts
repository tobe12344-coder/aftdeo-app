import type { Employee, AttendanceRecord, WasteData, Guest, SarprasItem } from './types';

export const employees: Employee[] = [
  { id: 'T732757644', name: 'Halilur Rahman' },
  { id: 'T000000001', name: 'Ahmad Subarjo' },
  { id: 'T000000002', name: 'Budi Santoso' },
  { id: 'T000000003', name: 'Citra Lestari' },
  { id: 'T000000004', name: 'Dewi Anggraini' },
  { id: 'T000000005', name: 'Eko Prasetyo' },
  { id: 'T000000006', name: 'Fitriani Hapsari' },
  { id: 'T000000007', name: 'Gunawan Wicaksono' },
  { id: 'T000000008', name: 'Herlina' },
  { id: 'T000000009', name: 'Indra Setiawan' },
  { id: 'T000000010', name: 'Joko Susilo' },
];

export const mockAttendance: AttendanceRecord[] = [
    // { name: 'Ahmad Subarjo', status: 'Clocked Out', clockIn: '08:01:12', clockOut: '17:05:30', leaveOut: '12:00:05', returnIn: '12:55:10', notes: 'Ishoma' },
    // { name: 'Budi Santoso', status: 'Present', clockIn: '07:59:01', clockOut: '-', leaveOut: '-', returnIn: '-', notes: '-' },
    // { name: 'Citra Lestari', status: 'Absent', clockIn: '-', clockOut: '-', leaveOut: '-', returnIn: '-', notes: 'Sakit' },
    // { name: 'Dewi Anggraini', status: 'On Leave', clockIn: '08:05:45', clockOut: '-', leaveOut: '10:15:00', returnIn: '-', notes: 'Keperluan keluarga' },
];

export const mockWasteData: WasteData[] = [
    { id: '1', jenis: 'Oli bekas', jumlah: 20, unit: 'Liter', tanggalMasuk: '2023-10-26', sumber: 'Operasional', status: 'Disimpan Sementara', perlakuan: 'DISIMPAN DI TPS' },
    { id: '2', jenis: 'Kain Majun Bekas', jumlah: 5, unit: 'Kg', tanggalMasuk: '2023-10-25', sumber: 'Proses', status: 'Disimpan Sementara', perlakuan: 'DISIMPAN DI TPS', kodeManifestasi: 'M-12345' },
];

export const mockGuests: Guest[] = [
  {
    id: '1',
    name: 'Rina S.',
    alamat: 'Jl. Merdeka No. 10, Jakarta',
    perusahaan: 'Auditor Independen',
    yangDikunjungi: 'Manajer Operasional',
    maksudKunjungan: 'Kunjungan dalam rangka audit sistem. Mohon bantuannya.',
    tandaPengenal: 'KTP-3172051010880001',
    zona: 'Terbatas',
    timestamp: '2024-05-20T09:30:00Z',
  },
  {
    id: '2',
    name: 'Perwakilan DLH',
    alamat: 'Jl. Gatot Subroto No. 5, Sorong',
    perusahaan: 'Dinas Lingkungan Hidup',
    yangDikunjungi: 'HSE Dept',
    maksudKunjungan: 'Inspeksi rutin terkait pengelolaan limbah B3. Terima kasih atas kerja samanya.',
    tandaPengenal: 'ID-DLH-005',
    zona: 'Terlarang',
    timestamp: '2024-05-18T14:00:00Z',
  },
];

export const mockSarpras: SarprasItem[] = [
  { id: 'S001', name: 'Mobil Tangki 01', category: 'Kendaraan', status: 'Baik', lastMaintenance: '2024-03-15', location: 'Garasi A' },
  { id: 'S002', name: 'Pompa Transfer A', category: 'Peralatan', status: 'Perlu Perbaikan', lastMaintenance: '2024-01-20', location: 'Area Pengisian' },
  { id: 'S003', name: 'Gedung Kantor', category: 'Bangunan', status: 'Baik', lastMaintenance: '2024-05-01', location: 'Area Kantor' },
];