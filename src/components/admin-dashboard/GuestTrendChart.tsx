
'use client';

import { useMemo } from 'react';
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import type { Guest } from '@/lib/types';

const chartConfig = {
  visitors: {
    label: 'Tamu',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

interface GuestTrendChartProps {
  guestData: Guest[];
}

export default function GuestTrendChart({ guestData }: GuestTrendChartProps) {
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
    }).reverse();

    const data = last7Days.map(date => {
        const count = guestData.filter(guest => guest.timestamp.toDate().toISOString().split('T')[0] === date).length;
        return {
            date: new Date(date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
            tamu: count
        };
    });
    return data;
  }, [guestData]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tren Kunjungan Tamu</CardTitle>
        <CardDescription>Jumlah tamu dalam 7 hari terakhir</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <YAxis allowDecimals={false} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Line
              dataKey="tamu"
              type="monotone"
              stroke="var(--color-visitors)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
