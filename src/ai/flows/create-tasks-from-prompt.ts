'use server';

/**
 * @fileOverview Creates a category and a list of tasks from a user's natural language prompt.
 * 
 * - createTasksFromPrompt - A function that creates tasks based on a prompt.
 * - CreateTasksFromPromptInput - The input type for the createTasksFromPrompt function.
 * - CreateTasksFromPromptOutput - The return type for the createTasksFromPrompt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CreateTasksFromPromptInputSchema = z.object({
  prompt: z.string().describe('The user\'s request, in natural language.'),
});
export type CreateTasksFromPromptInput = z.infer<typeof CreateTasksFromPromptInputSchema>;

const CreateTasksFromPromptOutputSchema = z.object({
  category: z.object({
    name: z.string().describe("A concise, relevant name for the project or list. Examples: 'Trip to Hawaii', 'Kitchen Renovation', 'Q3 Marketing Plan'"),
  }),
  tasks: z.array(z.object({
    description: z.string().describe("The specific, actionable task description."),
    priority: z.enum(['low', 'medium', 'high']).describe("The priority of the task."),
  })).describe("An array of tasks to be created."),
});
export type CreateTasksFromPromptOutput = z.infer<typeof CreateTasksFromPromptOutputSchema>;

export async function createTasksFromPrompt(input: CreateTasksFromPromptInput): Promise<CreateTasksFromPromptOutput> {
  return createTasksFromPromptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'createTasksFromPromptPrompt',
  input: {schema: CreateTasksFromPromptInputSchema},
  output: {schema: CreateTasksFromPromptOutputSchema},
  prompt: `You are an expert project manager. A user will provide a prompt describing something they want to accomplish. Your job is to break down their request into a list of actionable tasks and a single, descriptive category for those tasks.

Analyze the user's prompt and generate a list of tasks. For each task, provide a clear description and assign a priority (low, medium, or high).
Finally, create a single, clear category name that encapsulates the entire project.

User Prompt:
{{{prompt}}}
`,
});

const createTasksFromPromptFlow = ai.defineFlow(
  {
    name: 'createTasksFromPromptFlow',
    inputSchema: CreateTasksFromPromptInputSchema,
    outputSchema: CreateTasksFromPromptOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
