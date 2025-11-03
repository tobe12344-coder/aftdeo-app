'use client';

import { useMemo, useState } from 'react';
import type { WasteData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import { FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface WasteLogbookProps {
  wasteData: WasteData[];
  loading: boolean;
}

// Extend jsPDF to include autoTable
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

export default function WasteLogbook({ wasteData, loading }: WasteLogbookProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const filteredData = useMemo(() => {
    return wasteData.filter(item => item.tanggalMasuk.startsWith(selectedMonth));
  }, [wasteData, selectedMonth]);

  const convertToTon = (jumlah: number, unit: string) => {
    switch (unit.toUpperCase()) {
      case 'KG':
        return jumlah / 1000;
      case 'LITER': // Assuming density of 1 for simplicity
        return jumlah / 1000;
      case 'TON':
        return jumlah;
      default:
        return jumlah;
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF('landscape') as jsPDFWithAutoTable;
    const monthName = new Date(selectedMonth + '-02').toLocaleString('id-ID', { month: 'long', year: 'numeric' });

    // Header
    doc.setFontSize(14);
    doc.text('PT. PERTAMINA PATRA NIAGA', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    doc.text('AFT DEO SORONG', doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN LOG BOOK LIMBAH BAHAN BERBAHAYA DAN BERACUN', doc.internal.pageSize.getWidth() / 2, 30, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Periode: ${monthName}`, doc.internal.pageSize.getWidth() / 2, 37, { align: 'center' });

    const tableData = filteredData.map((item, index) => {
        const jumlahTon = convertToTon(item.jumlah, item.unit);
        return [
            index + 1,
            item.jenis,
            new Date(item.tanggalMasuk + 'T00:00:00').toLocaleDateString('id-ID'),
            item.sumber,
            item.perlakuan === 'DIHASILKAN' || item.perlakuan === 'DISIMPAN DI TPS' ? jumlahTon.toFixed(4) : '-',
            '', // Batas Waktu Simpan
            '', // Tanggal Keluar
            item.perlakuan === 'DISERAHKAN KEPIHAK KETIGA BERIZIN' ? jumlahTon.toFixed(4) : '-', // Jumlah Keluar
            item.perlakuan === 'DISERAHKAN KEPIHAK KETIGA BERIZIN' ? 'Pihak Ketiga' : '', // Tujuan
            '', // Bukti Dokumen
            '', // Sisa
            item.catatan || '', // Keterangan
        ];
    });

    doc.autoTable({
        head: [
            [
                { content: 'NO', rowSpan: 2 },
                { content: 'JENIS LIMBAH B3', rowSpan: 2 },
                { content: 'MASUKNYA LIMBAH B3 KE TPS', colSpan: 4 },
                { content: 'KELUARNYA LIMBAH B3 DARI TPS', colSpan: 4 },
                { content: 'SISA LIMBAH B3 DI TPS (Ton)', rowSpan: 2 },
                { content: 'KETERANGAN', rowSpan: 2 },
            ],
            [
                'Tanggal Masuk LB3',
                'Sumber LB3',
                'Jumlah LB3 (Ton)',
                'Batas Waktu Simpan',
                'Tanggal Keluar',
                'Jumlah LB3 (Ton)',
                'Tujuan Penyerahan',
                'Bukti Dokumen',
            ]
        ],
        body: tableData,
        startY: 45,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1.5, halign: 'center' },
        headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
        didDrawPage: (data) => {
            // Footer (Signature)
            const pageHeight = doc.internal.pageSize.height;
            doc.setFontSize(10);
            doc.text('Disiapkan oleh,', 20, pageHeight - 40);
            doc.text('Joni Herawan', 20, pageHeight - 20);
        }
    });

    doc.save(`Logbook_Limbah_B3_${selectedMonth}.pdf`);
  };


  if (loading) {
    return (
      <Card className="max-w-full mx-auto mt-8">
        <CardHeader>
          <CardTitle>Laporan Log Book Limbah B3</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-full mx-auto mt-8 overflow-x-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Laporan Log Book Limbah B3</CardTitle>
          <p className="text-sm text-muted-foreground">Tampilan untuk laporan bulanan.</p>
        </div>
        <div className='flex items-center gap-4'>
            <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className='border border-gray-300 rounded-md p-2 text-sm' />
            <Button variant="outline" size="sm" onClick={exportToPDF} disabled={filteredData.length === 0}>
                <FileText className="mr-2 h-4 w-4" />
                Export Log Book to PDF
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border p-4">
            <div className="text-center mb-4">
                <h3 className="font-bold text-lg">PT. PERTAMINA PATRA NIAGA</h3>
                <h4 className="font-bold text-md">AFT DEO SORONG</h4>
                <h2 className="font-bold text-xl mt-2">LAPORAN LOG BOOK LIMBAH BAHAN BERBAHAYA DAN BERACUN</h2>
            </div>
            <table className="min-w-full border-collapse border border-gray-400 text-xs">
                <thead className='bg-gray-200 text-center font-bold'>
                    <tr>
                        <th rowSpan={2} className="border border-gray-400 p-1">NO</th>
                        <th rowSpan={2} className="border border-gray-400 p-1">JENIS LIMBAH B3</th>
                        <th colSpan={4} className="border border-gray-400 p-1">MASUKNYA LIMBAH B3 KE TPS</th>
                        <th colSpan={4} className="border border-gray-400 p-1">KELUARNYA LIMBAH B3 DARI TPS</th>
                        <th rowSpan={2} className="border border-gray-400 p-1">SISA LIMBAH B3 DI TPS (Ton)</th>
                        <th rowSpan={2} className="border border-gray-400 p-1">Keterangan</th>
                    </tr>
                    <tr>
                        <th className="border border-gray-400 p-1">Tanggal Masuk LB3</th>
                        <th className="border border-gray-400 p-1">Sumber LB3</th>
                        <th className="border border-gray-400 p-1">Jumlah LB3 (Ton)</th>
                        <th className="border border-gray-400 p-1">Batas Waktu Simpan</th>
                        <th className="border border-gray-400 p-1">Tanggal Keluar</th>
                        <th className="border border-gray-400 p-1">Jumlah LB3 (Ton)</th>
                        <th className="border border-gray-400 p-1">Tujuan Penyerahan</th>
                        <th className="border border-gray-400 p-1">Bukti Dokumen</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredData.length > 0 ? filteredData.map((item, index) => {
                        const jumlahTon = convertToTon(item.jumlah, item.unit);
                        const isMasuk = item.perlakuan === 'DIHASILKAN' || item.perlakuan === 'DISIMPAN DI TPS';
                        const isKeluar = item.perlakuan === 'DISERAHKAN KEPIHAK KETIGA BERIZIN';

                        return (
                            <tr key={item.id} className="text-center">
                                <td className="border border-gray-400 p-1">{index + 1}</td>
                                <td className="border border-gray-400 p-1 text-left">{item.jenis}</td>
                                <td className="border border-gray-400 p-1">{new Date(item.tanggalMasuk + 'T00:00:00').toLocaleDateString('id-ID')}</td>
                                <td className="border border-gray-400 p-1">{item.sumber}</td>
                                <td className="border border-gray-400 p-1">{isMasuk ? jumlahTon.toFixed(4) : '-'}</td>
                                <td className="border border-gray-400 p-1"></td>
                                <td className="border border-gray-400 p-1">{isKeluar ? new Date(item.tanggalMasuk + 'T00:00:00').toLocaleDateString('id-ID') : '-'}</td>
                                <td className="border border-gray-400 p-1">{isKeluar ? jumlahTon.toFixed(4) : '-'}</td>
                                <td className="border border-gray-400 p-1">{isKeluar ? 'Pihak Ketiga' : '-'}</td>
                                <td className="border border-gray-400 p-1"></td>
                                <td className="border border-gray-400 p-1"></td>
                                <td className="border border-gray-400 p-1 text-left">{item.catatan || ''}</td>
                            </tr>
                        )
                    }) : (
                        <tr>
                            <td colSpan={12} className="text-center border border-gray-400 p-4">Tidak ada data untuk bulan yang dipilih.</td>
                        </tr>
                    )}
                </tbody>
            </table>
            <div className="mt-8 flex justify-between">
                <div className="text-center">
                    <p>Disiapkan oleh,</p>
                    <div className="h-20"></div>
                    <p className="font-bold underline">Joni Herawan</p>
                </div>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
