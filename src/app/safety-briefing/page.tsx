
import BackButton from "@/components/common/BackButton";
import Header from "@/components/common/Header";
import SafetyBriefingClient from "@/components/safety-briefing/SafetyBriefingClient";
import { employees } from "@/lib/data";

export default function SafetyBriefingPage() {
    return (
        <>
        <Header />
        <div className="p-4 md:p-8">
            <BackButton />
            <SafetyBriefingClient employees={employees} />
        </div>
        </>
    );
}
