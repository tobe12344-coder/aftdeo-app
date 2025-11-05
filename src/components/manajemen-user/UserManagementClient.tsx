'use client';

import { useMemoFirebase } from '@/firebase';
import { useCollection, useFirestore } from '@/firebase';
import type { AppUser } from '@/lib/types';
import { collection, query, type CollectionReference } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Skeleton } from '../ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '../ui/badge';
import { updateUser } from '@/ai/flows/update-user';

export default function UserManagementClient() {
    const firestore = useFirestore();
    const { toast } = useToast();

    const usersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        // This query fetches all documents from the 'users' collection.
        // It requires Firestore security rules to allow the 'list' operation for admins.
        return query(collection(firestore, 'users') as CollectionReference<AppUser>);
    }, [firestore]);

    const { data: users, loading, error } = useCollection<AppUser>(usersQuery);

    const handleRoleChange = async (uid: string, role: 'admin' | 'employee' | 'security' | 'receptionist') => {
        const result = await updateUser({ uid, data: { role } });
        if (result.success) {
            toast({
                title: 'Peran Diperbarui',
                description: `Peran pengguna telah berhasil diubah menjadi ${role}.`,
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'Gagal Memperbarui Peran',
                description: result.message,
            });
        }
    };

    const handleStatusChange = async (uid: string, status: 'pending' | 'approved') => {
        const result = await updateUser({ uid, data: { status } });
         if (result.success) {
            toast({
                title: 'Status Diperbarui',
                description: `Status pengguna telah berhasil diubah menjadi ${status}.`,
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'Gagal Memperbarui Status',
                description: result.message,
            });
        }
    };
    
    const getStatusBadgeVariant = (status?: string) => {
        switch (status) {
            case 'approved':
                return 'default';
            case 'pending':
                return 'secondary';
            default:
                return 'outline';
        }
    }

    const getRoleBadgeVariant = (role?: string) => {
        switch (role) {
            case 'admin':
                return 'destructive';
            case 'security':
                return 'secondary';
            case 'receptionist':
                return 'default';
            default:
                return 'default';
        }
    }

    if (error) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Manajemen Pengguna</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center text-red-500">
                        <p>Gagal memuat data pengguna: Izin tidak cukup.</p>
                        <p className="text-sm">Pastikan akun Anda memiliki peran 'admin' dan aturan keamanan Firestore sudah benar.</p>
                    </div>
                </CardContent>
            </Card>
        )
    }


    return (
        <Card>
            <CardHeader>
                <CardTitle>Manajemen Pengguna</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>Peran</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 3 }).map((_, index) => (
                                    <TableRow key={index}>
                                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                        <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                                    </TableRow>
                                ))
                            ) : users && users.length > 0 ? (
                                users.map(user => (
                                    <TableRow key={user.uid}>
                                        <TableCell className="font-medium">{user.email}</TableCell>
                                        <TableCell>
                                            <Select
                                                defaultValue={user.role}
                                                onValueChange={(value) => handleRoleChange(user.uid, value as any)}
                                            >
                                                <SelectTrigger className="w-[180px]">
                                                    <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize">{user.role || 'Belum diatur'}</Badge>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="admin">Admin</SelectItem>
                                                    <SelectItem value="employee">Employee</SelectItem>
                                                    <SelectItem value="security">Security</SelectItem>
                                                    <SelectItem value="receptionist">Receptionist</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Select
                                                defaultValue={user.status}
                                                onValueChange={(value) => handleStatusChange(user.uid, value as any)}
                                            >
                                                <SelectTrigger className="w-[180px]">
                                                     <Badge variant={getStatusBadgeVariant(user.status)} className="capitalize">{user.status || 'Belum diatur'}</Badge>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="pending">Pending</SelectItem>
                                                    <SelectItem value="approved">Approved</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center">Tidak ada pengguna terdaftar.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

    
    