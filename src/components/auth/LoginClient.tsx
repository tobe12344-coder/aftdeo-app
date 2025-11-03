
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/firebase';
import { login } from '@/firebase/auth/auth';
import { Loader2 } from 'lucide-react';
import type { FirebaseError } from 'firebase/app';

const authSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

type AuthFormValues = z.infer<typeof authSchema>;

function getFriendlyErrorMessage(error: FirebaseError): string {
    switch (error.code) {
        case 'auth/wrong-password':
        case 'auth/user-not-found': // Legacy error codes
        case 'auth/invalid-credential': // New consolidated error code
            return 'Email atau password salah. Silakan periksa kembali.';
        case 'auth/invalid-email':
            return 'Format email tidak valid.';
        case 'auth/weak-password':
            return 'Password terlalu lemah. Gunakan minimal 6 karakter.';
        default:
            console.error('Unhandled Firebase Auth Error:', error);
            return 'Terjadi kesalahan yang tidak diketahui. Silakan coba beberapa saat lagi.';
    }
}


export default function LoginClient() {
  const { toast } = useToast();
  const auth = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleLogin = async (values: AuthFormValues) => {
    setLoading(true);
    setError(null);
    try {
      await login(auth, values.email, values.password);
      toast({
        title: 'Berhasil!',
        description: 'Anda berhasil login.',
      });
      router.push('/');
    } catch (err: any) {
      const friendlyMessage = getFriendlyErrorMessage(err);
      setError(friendlyMessage);
      toast({
        variant: 'destructive',
        title: 'Gagal',
        description: friendlyMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>Sistem Manajemen AFTDEO</CardTitle>
        <CardDescription>Silakan masuk untuk melanjutkan</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-4">
                <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                        <Input placeholder="admin@pertamina.com" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                        <Input type="password" placeholder="******" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
                >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Masuk
                </Button>
            </form>
        </Form>
      </CardContent>
    </Card>
  );
}
