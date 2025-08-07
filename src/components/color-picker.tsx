'use client';

import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { availableColors } from './add-task-dialog';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-[120px] justify-between"
        >
          <div className="flex items-center gap-2">
            <span className={cn('w-4 h-4 rounded-full', value)}></span>
            <span className="text-sm">Color</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[180px] p-2">
        <div className="grid grid-cols-6 gap-2">
          {availableColors.map((color) => (
            <Button
              key={color}
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full p-0"
              onClick={() => onChange(color)}
            >
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center',
                  color
                )}
              >
                {value === color && <Check className="h-4 w-4 text-white" />}
              </div>
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
