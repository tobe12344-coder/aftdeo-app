
import BackButton from "@/components/common/BackButton";
import SarprasClient from "@/components/sarpras/SarprasClient";
import Header from "@/components/common/Header";

export default function SarprasPage() {
    return (
        <>
            <Header />
            <div className="p-4 md:p-8">
                <BackButton />
                <SarprasClient />
            </div>
        </>
    );
}
