
'use client';

import BackButton from "@/components/common/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/firebase";
import { ShieldAlert } from "lucide-react";
import AdminDashboardClient from "@/components/admin-dashboard/AdminDashboardClient";
import Header from "@/components/common/Header";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboardPage() {
    const { user, loading } = useUser();

    return (
        <>
            <Header />
            <div className="p-4 md:p-8">
                <BackButton />
                {loading ? (
                    <div className="space-y-8">
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard Admin</h1>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            <Skeleton className="h-[350px]" />
                            <Skeleton className="h-[350px]" />
                            <Skeleton className="h-[350px]" />
                        </div>
                    </div>
                ) : user?.role === 'admin' ? (
                    <AdminDashboardClient />
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
