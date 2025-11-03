'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating daily operational reports.
 *
 * - generateDailyReport - A function that generates a daily operational report.
 * - GenerateDailyReportInput - The input type for the generateDailyReport function.
 * - GenerateDailyReportOutput - The return type for the generateDailyReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDailyReportInputSchema = z.object({
  date: z
    .string()
    .describe('The date for which to generate the report (YYYY-MM-DD).'),
  activities: z.string().describe('A summary of activities for the day.'),
  attendanceSummary: z
    .string()
    .describe('A summary of employee attendance for the day.'),
  b3WasteSummary: z.string().describe('A summary of B3 waste data for the day.'),
});
export type GenerateDailyReportInput = z.infer<typeof GenerateDailyReportInputSchema>;

const GenerateDailyReportOutputSchema = z.object({
  report: z.string().describe('The generated daily operational report.'),
});
export type GenerateDailyReportOutput = z.infer<typeof GenerateDailyReportOutputSchema>;

export async function generateDailyReport(
  input: GenerateDailyReportInput
): Promise<GenerateDailyReportOutput> {
  return generateDailyReportFlow(input);
}

const generateDailyReportPrompt = ai.definePrompt({
  name: 'generateDailyReportPrompt',
  input: {schema: GenerateDailyReportInputSchema},
  output: {schema: GenerateDailyReportOutputSchema},
  prompt: `You are an AI assistant tasked with generating a daily operational report.

  Date: {{{date}}}
  Activities Summary: {{{activities}}}
  Attendance Summary: {{{attendanceSummary}}}
  B3 Waste Summary: {{{b3WasteSummary}}}

  Based on the provided summaries of activities, attendance, and B3 waste data,
  generate a comprehensive daily operational report. Highlight any salient points
  and ensure that no important information is overlooked.
  The report should be well-structured and easy to read.
  Follow general guidelines for writing operational report.
  Do not include any greetings or salutations.
  `,
});

const generateDailyReportFlow = ai.defineFlow(
  {
    name: 'generateDailyReportFlow',
    inputSchema: GenerateDailyReportInputSchema,
    outputSchema: GenerateDailyReportOutputSchema,
  },
  async input => {
    const {output} = await generateDailyReportPrompt(input);
    return output!;
  }
);
