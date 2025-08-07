'use client';

import Image from 'next/image';
import { Button } from './ui/button';
import { PlusCircle } from 'lucide-react';

interface NoBoardsProps {
    onAddBoardClick: () => void;
}

export function NoBoards({ onAddBoardClick }: NoBoardsProps) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center py-16 px-4">
            <Image 
                src="https://placehold.co/400x300.png" 
                data-ai-hint="empty state projects"
                alt="Illustration of empty boards" 
                width={400} 
                height={300} 
                className="mx-auto mb-8 rounded-lg shadow-sm" 
            />
            <h2 className="text-2xl font-semibold font-headline mb-2">Create a board to get started</h2>
            <p className="max-w-md mx-auto text-muted-foreground mb-6">
                Boards are where you organize your tasks. You can create boards for different projects, like &quot;Work&quot;, &quot;Home&quot;, or &quot;Vacation Plans&quot;.
            </p>
            <Button onClick={onAddBoardClick}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Your First Board
            </Button>
        </div>
    );
}
