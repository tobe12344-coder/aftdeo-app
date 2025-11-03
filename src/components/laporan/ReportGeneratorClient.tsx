'use client';

import { useFormStatus } from 'react-dom';
import { useActionState, useEffect } from 'react';
import { generateReportAction } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const initialState = {
  message: null,
  errors: null,
  report: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      Generate Laporan
    </Button>
  );
}

export default function ReportGeneratorClient() {
  const [state, formAction] = useActionState(generateReportAction, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.message && state.message !== "Report generated successfully.") {
        toast({
            variant: "destructive",
            title: "Error",
            description: state.message,
        });
    }
  }, [state, toast]);

  return (
    <div>
      <form action={formAction} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="date">Tanggal Laporan</Label>
                <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
            </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="activities">Ringkasan Aktivitas Harian</Label>
          <Textarea
            id="activities"
            name="activities"
            placeholder="Contoh: Penerimaan 2 truk tangki, maintenance pompa X, rapat keselamatan..."
            rows={4}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="attendanceSummary">Ringkasan Absensi</Label>
          <Textarea
            id="attendanceSummary"
            name="attendanceSummary"
            placeholder="Contoh: 10 dari 12 pegawai hadir, 1 sakit, 1 izin..."
            rows={3}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="b3WasteSummary">Ringkasan Limbah B3</Label>
          <Textarea
            id="b3WasteSummary"
            name="b3WasteSummary"
            placeholder="Contoh: Penambahan 2 drum oli bekas, tidak ada pengeluaran..."
            rows={3}
            required
          />
        </div>
        <SubmitButton />
      </form>

      {state.report && (
        <Card className="mt-8">
            <CardHeader>
                <CardTitle>Hasil Laporan</CardTitle>
                <CardDescription>Berikut adalah laporan yang dihasilkan oleh AI.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap rounded-md border p-4 bg-secondary">
                    {state.report}
                </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
