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
  try {
    console.log('Suggesting category for description:', input.description.substring(0, 50));
    const result = await suggestTaskCategoryFlow(input);
    console.log('AI suggestion result:', result);
    return result;
  } catch (error) {
    console.error('Error in suggestTaskCategory:', error);
    throw error;
  }
}

const prompt = ai.definePrompt({
  name: 'suggestTaskCategoryPrompt',
  input: {schema: SuggestTaskCategoryInputSchema},
  output: {schema: SuggestTaskCategoryOutputSchema},
  prompt: `You are a task management assistant. Given a task description, suggest a meaningful category name that describes WHAT the task is about, not its status or progress.

The category should be:
- A noun or noun phrase (2-3 words max)
- Descriptive of the task's subject matter or domain
- Something that could group similar tasks together by TOPIC/AREA

Examples of GOOD categories:
- "Buy groceries" → "Shopping"
- "Fix the kitchen sink" → "Home Repairs" 
- "Prepare presentation for Monday" → "Work Projects"
- "Call mom for birthday" → "Family"
- "Go to gym" → "Health & Fitness"
- "Read chapter 5" → "Education"
- "Plan vacation" → "Travel"
- "Pay electricity bill" → "Bills & Finance"
- "Write blog post" → "Content Creation"

NEVER suggest these status/progress categories:
- "To Do", "In Progress", "Done", "Pending", "Complete", "Incomplete"
- "High Priority", "Low Priority", "Urgent"
- "Active", "Inactive", "Finished", "Started"

Focus on the SUBJECT MATTER, not the state of the task.

Task Description: {{{description}}}

Suggested Category:`,
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
