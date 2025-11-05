'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';

import type { SafetyBriefing, Employee } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, type CollectionReference } from 'firebase/firestore';
import { addSafetyBriefing } from '@/firebase/firestore/safety-briefing';

import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';

const safetyBriefingSchema = z.object({
  date: z.string().min(1, 'Tanggal wajib diisi'),
  topic: z.string().min(1, 'Topik/Judul wajib diisi'),
  conductor: z.string().min(1, 'Nama pemateri wajib diisi'),
  attendees: z.array(z.string()).min(1, 'Pilih minimal satu peserta'),
  notes: z.string().optional(),
});

type SafetyBriefingFormValues = z.infer<typeof safetyBriefingSchema>;

interface SafetyBriefingClientProps {
  employees: Employee[];
}

export default function SafetyBriefingClient({ employees }: SafetyBriefingClientProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<SafetyBriefingFormValues>({
    resolver: zodResolver(safetyBriefingSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      topic: '',
      conductor: '',
      attendees: [],
      notes: '',
    },
  });

  const briefingsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'safety-briefings') as CollectionReference<SafetyBriefing>, orderBy('timestamp', 'desc'));
  }, [firestore]);

  const { data: briefings, loading } = useCollection<SafetyBriefing>(briefingsQuery);
  
  const memoizedEmployees = useMemo(() => employees, [employees]);


  async function onSubmit(values: SafetyBriefingFormValues) {
    if (!firestore) return;

    addSafetyBriefing(firestore, values);
    toast({
      title: 'Berhasil',
      description: 'Data safety briefing telah berhasil disimpan.',
    });
    form.reset({
      date: new Date().toISOString().split('T')[0],
      topic: '',
      conductor: '',
      attendees: [],
      notes: '',
    });
  }

  return (
    <div className="space-y-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Buku Log Safety Briefing</CardTitle>
          <CardDescription>Catat kegiatan safety briefing harian di sini.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem><FormLabel>Tanggal Briefing</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="conductor" render={({ field }) => (
                  <FormItem><FormLabel>Materi Dibawakan Oleh</FormLabel><FormControl><Input placeholder="Nama pemateri" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="topic" render={({ field }) => (
                <FormItem><FormLabel>Judul / Topik Safety Briefing</FormLabel><FormControl><Input placeholder="Contoh: Penggunaan APAR yang Benar" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Ringkasan Materi / Isu Operasional</FormLabel><FormControl><Textarea placeholder="Catat poin-poin penting atau isu yang dibahas..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              
              <FormField
                control={form.control}
                name="attendees"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Daftar Hadir Peserta</FormLabel>
                      <FormMessage />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-60 overflow-y-auto p-4 border rounded-md">
                      {memoizedEmployees.map((employee) => (
                        <FormField
                          key={employee.id}
                          control={form.control}
                          name="attendees"
                          render={({ field }) => (
                            <FormItem key={employee.id} className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(employee.name)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, employee.name])
                                      : field.onChange(field.value?.filter((value) => value !== employee.name));
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal text-sm">{employee.name}</FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </FormItem>
                )}
              />

              <div className="text-right">
                <Button type="submit" disabled={form.formState.isSubmitting}>Simpan Briefing</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Riwayat Safety Briefing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              Array.from({ length: 2 }).map((_, index) => <Skeleton key={index} className="h-20 w-full" />)
            ) : briefings && briefings.length > 0 ? (
              <Accordion type="single" collapsible className="w-full">
                {briefings.map(briefing => (
                  <AccordionItem value={briefing.id} key={briefing.id}>
                    <AccordionTrigger>
                      <div className="flex justify-between w-full pr-4">
                        <span className="font-semibold">{briefing.topic}</span>
                        <span className="text-sm text-muted-foreground">{format(briefing.timestamp.toDate(), "eeee, d MMMM yyyy", { locale: indonesiaLocale })}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="prose prose-sm max-w-none text-gray-700">
                        <p><strong>Pemateri:</strong> {briefing.conductor}</p>
                        {briefing.notes && <p><strong>Catatan:</strong> {briefing.notes}</p>}
                        <p className="font-semibold mt-4">Peserta ({briefing.attendees.length} orang):</p>
                        <ul className="list-disc list-inside grid grid-cols-2 md:grid-cols-3 gap-x-4">
                          {briefing.attendees.map(name => <li key={name}>{name}</li>)}
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <p className="text-center text-muted-foreground">Belum ada riwayat safety briefing yang tercatat.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    