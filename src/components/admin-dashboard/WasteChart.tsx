
'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import type { WasteData } from '@/lib/types';

const chartConfig = {
  jumlah: {
    label: 'Jumlah (Ton)',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

const JENIS_LIMBAH = [
  'Oli bekas',
  'Filter Bekas',
  'Accu Bekas',
  'Kemasan Tinta Bekas',
  'Kain Majun Bekas',
  'Lampu Bekas',
];

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

interface WasteChartProps {
  wasteData: WasteData[];
}

export default function WasteChart({ wasteData }: WasteChartProps) {
  const chartData = useMemo(() => {
    const wasteTotals: { [key: string]: number } = {};
    JENIS_LIMBAH.forEach(jenis => wasteTotals[jenis] = 0);

    wasteData.forEach(item => {
        if (item.perlakuan === 'DISIMPAN DI TPS' || item.perlakuan === 'DIHASILKAN') {
            const ton = convertToTon(item.jumlah, item.unit);
            if (wasteTotals.hasOwnProperty(item.jenis)) {
                wasteTotals[item.jenis] += ton;
            }
        }
    });

    return Object.keys(wasteTotals).map(jenis => ({
      jenis: jenis.replace(' Bekas', ''),
      jumlah: parseFloat(wasteTotals[jenis].toFixed(3)),
    }));
  }, [wasteData]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stok Limbah B3 Tersimpan</CardTitle>
        <CardDescription>Total volume limbah B3 yang saat ini disimpan di TPS.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="jenis"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 4)}
            />
            <YAxis />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
            <Bar dataKey="jumlah" fill="var(--color-jumlah)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
