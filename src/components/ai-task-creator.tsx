'use client';

import { useState, useTransition } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CreateTasksFromPromptOutput } from '@/ai/flows/create-tasks-from-prompt';

interface AiTaskCreatorProps {
    onCreateTasks: (result: CreateTasksFromPromptOutput) => Promise<void>;
}

export function AiTaskCreator({ onCreateTasks }: AiTaskCreatorProps) {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, startGenerationTransition] = useTransition();
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        startGenerationTransition(async () => {
            try {
                const response = await fetch('/api/ai/create-tasks', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ prompt }),
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result: CreateTasksFromPromptOutput = await response.json();
                await onCreateTasks(result);
                setPrompt('');
            } catch (error) {
                console.error("Error generating tasks from AI:", error);
                toast({
                    variant: 'destructive',
                    title: 'AI Task Creation Failed',
                    description: 'There was an error creating tasks with AI. Please try again.',
                });
            }
        });
    };
    
    return (
        <Card className="shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline">
                    <Sparkles className="h-6 w-6 text-primary" />
                    <span>Create Tasks with AI</span>
                </CardTitle>
                <CardDescription>
                    Describe what you want to do, and let AI generate the tasks and category for you.
                    For example: &quot;Plan a team offsite for Q3&quot;
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                     <Textarea
                        placeholder="I need to organize a surprise birthday party for Sarah..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={3}
                        disabled={isGenerating}
                     />
                    <Button type="submit" disabled={isGenerating || !prompt.trim()} className="self-end">
                        {isGenerating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Generate Tasks
                            </>
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
