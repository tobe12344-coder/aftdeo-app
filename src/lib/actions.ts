'use server';

import { generateDailyReport } from "@/ai/flows/generate-daily-report";
import { z } from "zod";

const reportSchema = z.object({
    date: z.string(),
    activities: z.string(),
    attendanceSummary: z.string(),
    b3WasteSummary: z.string(),
});

export async function generateReportAction(prevState: any, formData: FormData) {
    const validatedFields = reportSchema.safeParse({
        date: formData.get('date'),
        activities: formData.get('activities'),
        attendanceSummary: formData.get('attendanceSummary'),
        b3WasteSummary: formData.get('b3WasteSummary'),
    });

    if (!validatedFields.success) {
        return {
            message: "Invalid form data.",
            errors: validatedFields.error.flatten().fieldErrors,
            report: null,
        };
    }

    try {
        const result = await generateDailyReport(validatedFields.data);
        return {
            message: "Report generated successfully.",
            errors: null,
            report: result.report,
        };
    } catch (error) {
        console.error("Error generating report:", error);
        return {
            message: "Failed to generate report.",
            errors: null,
            report: null,
        };
    }
}
