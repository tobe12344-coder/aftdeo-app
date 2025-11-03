'use client';

import BackButton from "@/components/common/BackButton";
import Header from "@/components/common/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Phone, Copy } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const contactGroups = [
    {
        category: 'Darurat Internal',
        contacts: [
            { name: 'Fire Station', number: '111' },
            { name: 'Main Gate', number: '222' },
            { name: 'Clinic', number: '333' },
        ],
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
    },
    {
        category: 'Darurat Eksternal',
        contacts: [
            { name: 'Pemadam Kebakaran', number: '113' },
            { name: 'Ambulans', number: '118' },
            { name: 'Polisi', number: '110' },
        ],
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
    },
    {
        category: 'Manajemen & Fungsi',
        contacts: [
            { name: 'AFT Manager', number: '0812-xxxx-xxxx' },
            { name: 'Operation Head', number: '0812-xxxx-xxxx' },
            { name: 'HSE', number: '0812-xxxx-xxxx' },
        ],
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
    },
];


export default function KontakPage() {
    const { toast } = useToast();

    const handleCopy = (number: string) => {
        navigator.clipboard.writeText(number);
        toast({
            title: 'Berhasil Disalin',
            description: `Nomor ${number} telah disalin ke clipboard.`,
        });
    }

    return (
        <>
        <Header />
        <div className="p-4 md:p-8">
            <BackButton />
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Kontak Penting</h1>
                    <p className="mt-2 text-lg text-muted-foreground">Daftar nomor telepon darurat dan fungsional di lingkungan AFTDEO Sorong.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {contactGroups.map((group) => (
                        <Card key={group.category} className={`${group.bgColor} ${group.borderColor}`}>
                            <CardHeader>
                                <CardTitle className="text-xl text-center">{group.category}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-4">
                                    {group.contacts.map((contact) => (
                                        <li key={contact.name} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                                            <div>
                                                <p className="font-semibold text-gray-800">{contact.name}</p>
                                                <a href={`tel:${contact.number}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary">
                                                    <Phone className="h-4 w-4" />
                                                    <span>{contact.number}</span>
                                                </a>
                                            </div>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" onClick={() => handleCopy(contact.number)} aria-label={`Salin nomor ${contact.name}`}>
                                                            <Copy className="h-5 w-5 text-gray-500" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Salin nomor</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
        </>
    );
}
