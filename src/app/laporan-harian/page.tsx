
import BackButton from "@/components/common/BackButton";
import ReportGeneratorClient from "@/components/laporan/ReportGeneratorClient";
import Header from "@/components/common/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LaporanHarianPage() {
    return (
        <>
            <Header />
            <div className="p-4 md:p-8">
                <BackButton />
                <Card className="max-w-5xl mx-auto">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold text-gray-800">Generate Laporan Harian Operasional</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-6">
                            Masukkan ringkasan data dari modul lain untuk membuat laporan harian secara otomatis dengan bantuan AI.
                        </p>
                        <ReportGeneratorClient />
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
