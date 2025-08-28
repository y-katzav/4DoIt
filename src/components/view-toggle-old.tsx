'use client';

import { useState } from 'react';
import { LayoutGrid, Table, Merge, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';

export type ViewMode = 'cards' | 'table' | 'merged' | 'breakdown';

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
  const { t } = useI18n();
  
  return (
    <div className="flex items-center rounded-md border p-1">
      <Button
        variant={viewMode === 'cards' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('cards')}
        className={cn(
          "h-8 px-3",
          viewMode === 'cards' && "shadow-sm"
        )}
      >
        <LayoutGrid className="h-4 w-4 mr-2" />
        {t('views.cards')}
      </Button>
      <Button
        variant={viewMode === 'table' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('table')}
        className={cn(
          "h-8 px-3",
          viewMode === 'table' && "shadow-sm"
        )}
      >
        <Table className="h-4 w-4 mr-2" />
        {t('views.table')}
      </Button>
      <Button
        variant={viewMode === 'merged' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('merged')}
        className={cn(
          "h-8 px-3",
          viewMode === 'merged' && "shadow-sm"
        )}
      >
        <Merge className="h-4 w-4 mr-2" />
        {t('views.merged')}
      </Button>
      <Button
        variant={viewMode === 'breakdown' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('breakdown')}
        className={cn(
          "h-8 px-3",
          viewMode === 'breakdown' && "shadow-sm"
        )}
      >
        <BarChart3 className="h-4 w-4 mr-2" />
        {t('views.breakdown')}
      </Button>
    </div>
  );
}
