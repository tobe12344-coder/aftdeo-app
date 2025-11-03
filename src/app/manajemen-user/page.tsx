
'use client';

import BackButton from "@/components/common/BackButton";
import UserManagementClient from "@/components/manajemen-user/UserManagementClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/firebase";
import { ShieldAlert } from "lucide-react";
import Header from "@/components/common/Header";
import { Skeleton } from "@/components/ui/skeleton";

export default function ManajemenUserPage() {
    const { user, loading } = useUser();

    return (
        <>
            <Header />
            <div className="p-4 md:p-8">
                <BackButton />
                {loading ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Manajemen Pengguna</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <div className="space-y-4">
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                            </div>
                        </CardContent>
                    </Card>
                ) : user?.role === 'admin' ? (
                    <UserManagementClient />
                ) : (
                    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
                        <Card className="w-full max-w-md text-center">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-center gap-2">
                                    <ShieldAlert className="h-6 w-6 text-red-500" />
                                    Akses Ditolak
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground mb-4">Hanya administrator yang dapat mengakses halaman ini.</p>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </>
    );
}
