'use client';

import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, Crown } from 'lucide-react';
import ExcelJS from 'exceljs';
import type { Task, Category, BoardMember } from '@/lib/types';
import { format } from 'date-fns';
import { useI18n } from '@/hooks/use-i18n';
import { useSubscription } from '@/hooks/use-subscription';
import { CheckoutButton } from '@/components/checkout-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ExportExcelProps {
  tasks: Task[];
  categories: Category[];
  boardMembers: BoardMember[];
  boardName: string;
}

export function ExportExcel({ tasks, categories, boardMembers, boardName }: ExportExcelProps) {
  const { t } = useI18n();
  const { hasFeature } = useSubscription();

  const canExportAdvanced = hasFeature('advanced_export');
  
  const exportToExcel = async () => {
    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(t('stats.taskStats'));

    // Define columns with headers
    worksheet.columns = [
      { header: t('task.taskDescription'), key: 'description', width: 40 },
      { header: t('task.category'), key: 'category', width: 15 },
      { header: t('task.priority'), key: 'priority', width: 10 },
      { header: t('common.status'), key: 'status', width: 10 },
      { header: t('task.dueDate'), key: 'dueDate', width: 12 },
      { header: t('task.assignee'), key: 'assignee', width: 25 },
      { header: t('common.hasAttachment'), key: 'hasAttachment', width: 15 },
      { header: t('common.attachmentName'), key: 'attachmentName', width: 30 }
    ];

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4472C4' }
    };

    // Add tasks data
    tasks.forEach((task) => {
      const category = categories.find(c => c.id === task.categoryId);
      const assignee = task.assigneeUid ? 
        boardMembers.find(m => m.uid === task.assigneeUid)?.email || 'Unknown' : 
        'Unassigned';
      
      worksheet.addRow({
        description: task.description,
        category: category?.name || 'Uncategorized',
        priority: task.priority,
        status: task.completed ? t('common.completed') : t('common.pending'),
        dueDate: task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '',
        assignee: assignee,
        hasAttachment: task.fileUrl ? t('common.yes') : t('common.no'),
        attachmentName: task.fileName || ''
      });
    });

    // Auto-fit columns and add borders
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Style header row borders
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'medium' },
        left: { style: 'medium' },
        bottom: { style: 'medium' },
        right: { style: 'medium' }
      };
    });

    // Generate filename with timestamp
    const now = new Date();
    const dateStr = format(now, 'yyyy-MM-dd_HH-mm');
    const filename = `${boardName}_Tasks_${dateStr}.xlsx`;

    // Generate buffer and create download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportBasic = async () => {
    // Simple CSV-style export for free users
    const csvContent = tasks.map(task => {
      const category = categories.find(c => c.id === task.categoryId);
      return [
        `"${task.description}"`,
        `"${category?.name || 'Uncategorized'}"`,
        `"${task.priority}"`,
        `"${task.completed ? 'Completed' : 'Pending'}"`
      ].join(',');
    }).join('\n');

    const header = 'Description,Category,Priority,Status\n';
    const blob = new Blob([header + csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${boardName}-tasks.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!canExportAdvanced) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={tasks.length === 0}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={exportBasic}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV (Free)
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <CheckoutButton plan="pro" billingInterval="monthly" className="w-full justify-start p-2 h-auto">
              <Crown className="mr-2 h-4 w-4" />
              Export Excel (Pro)
            </CheckoutButton>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={tasks.length === 0}
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={exportBasic}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export Excel (Pro)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}