'use client';

import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet } from 'lucide-react';
import ExcelJS from 'exceljs';
import type { Task, Category, BoardMember } from '@/lib/types';
import { format } from 'date-fns';

interface ExportExcelProps {
  tasks: Task[];
  categories: Category[];
  boardMembers: BoardMember[];
  boardName: string;
}

export function ExportExcel({ tasks, categories, boardMembers, boardName }: ExportExcelProps) {
  const exportToExcel = async () => {
    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Tasks');

    // Define columns with headers
    worksheet.columns = [
      { header: 'Task Description', key: 'description', width: 40 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Priority', key: 'priority', width: 10 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Due Date', key: 'dueDate', width: 12 },
      { header: 'Assigned To', key: 'assignee', width: 25 },
      { header: 'Has Attachment', key: 'hasAttachment', width: 15 },
      { header: 'Attachment Name', key: 'attachmentName', width: 30 }
    ];

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4472C4' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Add data rows
    tasks.forEach((task, index) => {
      const category = categories.find(c => c.id === task.categoryId);
      const assignee = boardMembers.find(m => m.uid === task.assigneeUid);
      
      const row = worksheet.addRow({
        description: task.description,
        category: category?.name || 'Unknown',
        priority: task.priority,
        status: task.completed ? 'Completed' : 'Pending',
        dueDate: task.dueDate ? format(task.dueDate, 'dd/MM/yyyy') : '',
        assignee: assignee?.email || '',
        hasAttachment: task.fileUrl ? 'Yes' : 'No',
        attachmentName: task.fileName || ''
      });

      // Apply conditional formatting based on task status and priority
      if (task.completed) {
        // Green background for completed tasks
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'C6EFCE' }
        };
      } else if (task.priority === 'high') {
        // Light red background for high priority pending tasks
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFC7CE' }
        };
      } else if (task.priority === 'medium') {
        // Light yellow background for medium priority pending tasks
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFEB9C' }
        };
      }

      // Add borders to all cells
      row.eachCell({ includeEmpty: false }, (cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Add borders to header cells
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Generate filename with current date
    const now = new Date();
    const dateStr = format(now, 'yyyy-MM-dd_HH-mm');
    const filename = `${boardName}_Tasks_${dateStr}.xlsx`;

    // Generate buffer and create download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Button
      onClick={exportToExcel}
      variant="outline"
      size="sm"
      className="gap-2"
      disabled={tasks.length === 0}
    >
      <FileSpreadsheet className="h-4 w-4" />
      Export to Excel
    </Button>
  );
}
