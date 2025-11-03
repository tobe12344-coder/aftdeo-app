'use client';

import { Pie, PieChart, Cell, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { useMemo } from 'react';
import type { AttendanceRecord } from '@/lib/types';

interface AttendanceChartProps {
  attendanceData: AttendanceRecord[];
}

const chartConfig = {
  Hadir: { label: 'Hadir', color: 'hsl(var(--chart-2))' },
  Izin: { label: 'Izin', color: 'hsl(var(--chart-4))' },
  Pulang: { label: 'Pulang', color: 'hsl(var(--chart-5))' },
  'Belum Hadir': { label: 'Belum Hadir', color: 'hsl(var(--chart-3))' },
} satisfies ChartConfig;

export default function AttendanceChart({ attendanceData }: AttendanceChartProps) {
  const { chartData, totalEmployees } = useMemo(() => {
    const statusCounts = {
      Hadir: 0,
      Izin: 0,
      Pulang: 0,
      'Belum Hadir': 0,
    };
    
    attendanceData.forEach(record => {
      if (record.status === 'Present') statusCounts.Hadir++;
      else if (record.status === 'On Leave') statusCounts.Izin++;
      else if (record.status === 'Clocked Out') statusCounts.Pulang++;
      else if (record.status === 'Absent') statusCounts['Belum Hadir']++;
    });

    const data = [
      { name: 'Hadir', value: statusCounts.Hadir, fill: 'var(--color-Hadir)' },
      { name: 'Izin', value: statusCounts.Izin, fill: 'var(--color-Izin)' },
      { name: 'Pulang', value: statusCounts.Pulang, fill: 'var(--color-Pulang)' },
      { name: 'Belum Hadir', value: statusCounts['Belum Hadir'], fill: 'var(--color-Belum Hadir)' },
    ].filter(item => item.value > 0);

    return { chartData: data, totalEmployees: attendanceData.length };
  }, [attendanceData]);

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Absensi Pegawai Hari Ini</CardTitle>
        <CardDescription>Total {totalEmployees} Pegawai</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
          <PieChart>
            <Tooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel nameKey="name" />}
             />
            <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={60} strokeWidth={5}>
              {chartData.map((entry) => (
                 <Cell key={`cell-${entry.name}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
         <div className="flex items-center gap-2 font-medium leading-none">
          Total Pegawai: {totalEmployees}
        </div>
        <div className="leading-none text-muted-foreground">
          Ringkasan status kehadiran pegawai hari ini.
        </div>
      </CardFooter>
    </Card>
  );
}
