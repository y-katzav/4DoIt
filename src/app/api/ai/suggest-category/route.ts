import { NextRequest, NextResponse } from 'next/server';
import { suggestTaskCategory } from '@/ai/flows/suggest-task-category';

export async function POST(request: NextRequest) {
  try {
    const { description, existingCategories } = await request.json();

    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Description is required and must be a string' },
        { status: 400 }
      );
    }

    if (description.length < 10) {
      return NextResponse.json(
        { error: 'Description must be at least 10 characters' },
        { status: 400 }
      );
    }

    console.log('API: Suggesting category for description:', description.substring(0, 50));
    console.log('API: Existing categories:', existingCategories);
    
    const result = await suggestTaskCategory({ description });
    
    console.log('API: AI suggestion result:', result);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error in suggest-category:', error);
    
    // Return more specific error messages
    let errorMessage = 'Could not get an AI category suggestion.';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('quota') || error.message.includes('rate')) {
        errorMessage = 'AI service is temporarily unavailable. Please try again later.';
        statusCode = 429;
      } else if (error.message.includes('auth')) {
        errorMessage = 'Authentication error with AI service.';
        statusCode = 401;
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection.';
        statusCode = 503;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
