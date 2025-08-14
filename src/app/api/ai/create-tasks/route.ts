import { NextRequest, NextResponse } from 'next/server';
import { createTasksFromPrompt } from '@/ai/flows/create-tasks-from-prompt';
import { CreateTasksFromPromptOutput } from '@/ai/flows/create-tasks-from-prompt';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();
    
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required and must be a string' },
        { status: 400 }
      );
    }

    // בדוק אם יש Google API key
    if (!process.env.GOOGLE_API_KEY && !process.env.GEMINI_API_KEY) {
      console.warn('No Google API key found. Using mock data. Add GOOGLE_API_KEY to .env.local for real AI functionality.');
      
      // פתרון זמני - החזרת דוגמה ללא שימוש ב-AI
      const mockResult: CreateTasksFromPromptOutput = {
        category: {
          name: 'AI Generated Project'
        },
        tasks: [
          {
            description: `Task based on: ${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}`,
            priority: 'medium' as const
          },
          {
            description: 'Follow up on the main task',
            priority: 'low' as const
          },
          {
            description: 'Review and finalize',
            priority: 'high' as const
          }
        ]
      };
      return NextResponse.json(mockResult);
    }

    // אם יש API key, השתמש ב-AI האמיתי
    console.log('Using Google AI with API key');
    const result = await createTasksFromPrompt({ prompt });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating tasks with AI:', error);
    return NextResponse.json(
      { error: 'Failed to create tasks with AI' },
      { status: 500 }
    );
  }
}
