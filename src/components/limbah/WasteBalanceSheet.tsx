'use client';

import * as React from 'react';
import { useMemo } from 'react';
import type { WasteData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '../ui/skeleton';

interface WasteBalanceSheetProps {
  wasteData: WasteData[];
  loading: boolean;
}

const ALL_PERLAKUAN = [
  'DIHASILKAN',
  'DISIMPAN DI TPS',
  'DIMANFAATKAN SENDIRI',
  'DIOLAH SENDIRI',
  'DITIMBUN SENDIRI',
  'DISERAHKAN KEPIHAK KETIGA BERIZIN',
  'TIDAK DIKELOLA',
];

const JENIS_LIMBAH = [
  'Oli bekas',
  'Filter Bekas',
  'Accu Bekas',
  'Kemasan Tinta Bekas',
  'Kain Majun Bekas',
  'Lampu Bekas',
];

export default function WasteBalanceSheet({ wasteData, loading }: WasteBalanceSheetProps) {
  const { months, balanceData } = useMemo(() => {
    const now = new Date();
    const monthHeaders = Array.from({ length: 12 }).map((_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      return {
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        name: date.toLocaleString('id-ID', { month: 'short' }),
        year: date.getFullYear().toString(),
      };
    });

    if (!wasteData.length) {
      return { months: monthHeaders, balanceData: [] };
    }

    // Group by jenis
    const groupedData = JENIS_LIMBAH.map(jenis => {
        const items = wasteData.filter(d => d.jenis === jenis);
        return {
            jenis,
            sumber: items[0]?.sumber || '-',
            unit: items[0]?.unit || 'TON',
            perlakuan: ALL_PERLAKUAN.map(p => {
                const monthlyTotals: { [key: string]: number } = {};
                monthHeaders.forEach(m => monthlyTotals[m.key] = 0);
                
                let totalDihasilkan = 0;

                items.filter(item => item.perlakuan === p).forEach(item => {
                    const itemDate = new Date(item.tanggalMasuk + 'T00:00:00');
                    const monthKey = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`;
                    if (monthlyTotals.hasOwnProperty(monthKey)) {
                        monthlyTotals[monthKey] += item.jumlah;
                    }
                });

                if (p === 'DIHASILKAN') {
                    totalDihasilkan = Object.values(monthlyTotals).reduce((sum, val) => sum + val, 0);
                }

                return {
                    name: p,
                    monthly: monthHeaders.map(m => monthlyTotals[m.key] || 0),
                    totalDihasilkan: totalDihasilkan
                };
            })
        };
    });

    return { months: monthHeaders, balanceData: groupedData };
  }, [wasteData]);

  const getPerlakuanCellStyle = (perlakuan: string) => {
    switch (perlakuan) {
      case 'DIHASILKAN': return 'bg-yellow-400 font-bold';
      case 'DISIMPAN DI TPS': return 'bg-orange-400';
      case 'DIMANFAATKAN SENDIRI': return 'bg-green-400';
      case 'DIOLAH SENDIRI': return 'bg-blue-400';
      case 'DITIMBUN SENDIRI': return 'bg-pink-400';
      case 'DISERAHKAN KEPIHAK KETIGA BERIZIN': return 'bg-gray-400';
      case 'TIDAK DIKELOLA': return 'bg-gray-300';
      default: return 'bg-white';
    }
  };

  const years = useMemo(() => {
    const uniqueYears = [...new Set(months.map(m => m.year))];
    return uniqueYears.map(year => ({
      year,
      colSpan: months.filter(m => m.year === year).length,
    }));
  }, [months]);

  if (loading) {
    return (
        <Card className="max-w-fit mx-auto mt-8">
            <CardHeader>
                <CardTitle>Neraca Pengelolaan Limbah B3</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
                <Skeleton className="h-[400px] w-[1200px]" />
            </CardContent>
        </Card>
    )
  }

  return (
    <Card className="max-w-fit mx-auto mt-8">
      <CardHeader>
        <CardTitle>Neraca Pengelolaan Limbah B3</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-400 text-xs">
          <thead className="bg-green-200 text-center">
            <tr>
              <th rowSpan={3} className="border border-gray-400 p-2">NO</th>
              <th rowSpan={3} className="border border-gray-400 p-2">JENIS LIMBAH</th>
              <th rowSpan={3} className="border border-gray-400 p-2">SUMBER</th>
              <th rowSpan={3} className="border border-gray-400 p-2">SATUAN</th>
              <th rowSpan={3} className="border border-gray-400 p-2 bg-black text-white">PERLAKUAN</th>
              <th colSpan={months.length} className="border border-gray-400 p-2">TAHUN</th>
              <th colSpan={6} className="border border-gray-400 p-2">LIMBAH DIKELOLA</th>
              <th rowSpan={3} className="border border-gray-400 p-2">KETERANGAN</th>
              <th rowSpan={3} className="border border-gray-400 p-2">KODE MANIFEST</th>
            </tr>
            <tr>
                {years.map(y => (
                    <th key={y.year} colSpan={y.colSpan} className="border border-gray-400 p-2">{y.year}</th>
                ))}
                <th rowSpan={2} className="border border-gray-400 p-2 bg-yellow-400">LIMBAH DIHASILKAN</th>
                <th rowSpan={2} className="border border-gray-400 p-2 bg-orange-400">DISIMPAN DI TPS</th>
                <th rowSpan={2} className="border border-gray-400 p-2 bg-green-400">DIMANFAATKAN SENDIRI</th>
                <th rowSpan={2} className="border border-ray-400 p-2 bg-blue-400">DIOLAH SENDIRI</th>
                <th rowSpan={2} className="border border-gray-400 p-2 bg-pink-400">DITIMBUN SENDIRI</th>
                <th rowSpan={2} className="border border-gray-400 p-2 bg-gray-400">DISERAHKAN PIHAK KETIGA BERIZIN</th>
            </tr>
            <tr>
              {months.map(month => (
                <th key={month.key} className="border border-gray-400 p-2">{month.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {balanceData.map((data, index) => (
              <React.Fragment key={data.jenis}>
                {ALL_PERLAKUAN.map((perlakuanName, pIndex) => {
                  const perlakuanData = data.perlakuan.find(p => p.name === perlakuanName);
                  const totalDihasilkan = data.perlakuan.find(p => p.name === 'DIHASILKAN')?.totalDihasilkan || 0;
                  
                  return (
                    <tr key={`${data.jenis}-${perlakuanName}`}>
                      {pIndex === 0 && <td rowSpan={ALL_PERLAKUAN.length} className="border border-gray-400 p-2 text-center">{index + 1}</td>}
                      {pIndex === 0 && <td rowSpan={ALL_PERLAKUAN.length} className="border border-gray-400 p-2">{data.jenis}</td>}
                      {pIndex === 0 && <td rowSpan={ALL_PERLAKUAN.length} className="border border-gray-400 p-2 text-center">{data.sumber}</td>}
                      {pIndex === 0 && <td rowSpan={ALL_PERLAKUAN.length} className="border border-gray-400 p-2 text-center">{data.unit}</td>}
                      <td className={`border border-gray-400 p-1 text-left ${getPerlakuanCellStyle(perlakuanName)}`}>{perlakuanName}</td>
                      {perlakuanData?.monthly.map((val, mIndex) => (
                        <td key={mIndex} className="border border-gray-400 p-1 text-right">{val > 0 ? val.toFixed(3) : '0,000'}</td>
                      ))}
                      {pIndex === 0 && <td rowSpan={ALL_PERLAKUAN.length} className="border border-gray-400 p-1 text-right bg-yellow-200 font-bold">{totalDihasilkan.toFixed(3)}</td>}
                      {pIndex === 0 && <td rowSpan={ALL_PERLAKUAN.length} className="border border-gray-400 p-1 text-right bg-orange-200"></td>}
                      {pIndex === 0 && <td rowSpan={ALL_PERLAKUAN.length} className="border border-gray-400 p-1 text-right bg-green-200"></td>}
                      {pIndex === 0 && <td rowSpan={ALL_PERLAKUAN.length} className="border border-gray-400 p-1 text-right bg-blue-200"></td>}
                      {pIndex === 0 && <td rowSpan={ALL_PERLAKUAN.length} className="border border-gray-400 p-1 text-right bg-pink-200"></td>}
                      {pIndex === 0 && <td rowSpan={ALL_PERLAKUAN.length} className="border border-gray-400 p-1 text-right bg-gray-200"></td>}
                      <td className={`border border-gray-400 p-1 text-center ${getPerlakuanCellStyle(perlakuanName)}`}>
                        {perlakuanName === 'DISIMPAN DI TPS' ? 'disimpan di TPS LB3' : ''}
                      </td>
                      <td className="border border-gray-400 p-1">-</td>
                    </tr>
                  )
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
