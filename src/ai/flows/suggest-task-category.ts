'use server';

/**
 * @fileOverview Suggests task categories based on the task description.
 *
 * - suggestTaskCategory - A function that suggests task categories.
 * - SuggestTaskCategoryInput - The input type for the suggestTaskCategory function.
 * - SuggestTaskCategoryOutput - The return type for the suggestTaskCategory function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTaskCategoryInputSchema = z.object({
  description: z.string().describe('The description of the task.'),
});
export type SuggestTaskCategoryInput = z.infer<typeof SuggestTaskCategoryInputSchema>;

const SuggestTaskCategoryOutputSchema = z.object({
  category: z.string().describe('The suggested category for the task.'),
});
export type SuggestTaskCategoryOutput = z.infer<typeof SuggestTaskCategoryOutputSchema>;

export async function suggestTaskCategory(input: SuggestTaskCategoryInput): Promise<SuggestTaskCategoryOutput> {
  return suggestTaskCategoryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTaskCategoryPrompt',
  input: {schema: SuggestTaskCategoryInputSchema},
  output: {schema: SuggestTaskCategoryOutputSchema},
  prompt: `Given the following task description, suggest a category for the task.

Description: {{{description}}}

Category:`,
});

const suggestTaskCategoryFlow = ai.defineFlow(
  {
    name: 'suggestTaskCategoryFlow',
    inputSchema: SuggestTaskCategoryInputSchema,
    outputSchema: SuggestTaskCategoryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
