'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import type { Task, Category, Priority } from '@/lib/types';

interface TaskBreakdownProps {
  tasks: Task[];
  categories: Category[];
  title?: string;
}

interface TaskStats {
  total: number;
  completed: number;
  completionRate: number;
}

interface PriorityStats extends TaskStats {
  priority: Priority;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

interface CategoryStats extends TaskStats {
  category: Category;
}

export function TaskBreakdown({ tasks, categories, title }: TaskBreakdownProps) {
  const { t } = useI18n();
  const defaultTitle = t('stats.taskBreakdown');

  const priorityConfig = {
    high: {
      icon: <AlertTriangle className="h-4 w-4" />,
      color: 'text-red-600',
      bgColor: 'bg-red-50 border-red-200',
      label: t('priority.highPriority')
    },
    medium: {
      icon: <Clock className="h-4 w-4" />,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 border-yellow-200',
      label: t('priority.mediumPriority')
    },
    low: {
      icon: <CheckCircle2 className="h-4 w-4" />,
      color: 'text-green-600',
      bgColor: 'bg-green-50 border-green-200',
      label: t('priority.lowPriority')
    }
  };

  const stats = useMemo(() => {
    // סטטיסטיקות כלליות
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;
    const overallCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // סטטיסטיקות לפי עדיפות
    const priorityStats: PriorityStats[] = (['high', 'medium', 'low'] as Priority[]).map(priority => {
      const priorityTasks = tasks.filter(task => task.priority === priority);
      const completedPriorityTasks = priorityTasks.filter(task => task.completed);
      
      return {
        priority,
        total: priorityTasks.length,
        completed: completedPriorityTasks.length,
        completionRate: priorityTasks.length > 0 ? (completedPriorityTasks.length / priorityTasks.length) * 100 : 0,
        icon: priorityConfig[priority].icon,
        color: priorityConfig[priority].color,
        bgColor: priorityConfig[priority].bgColor
      };
    });

    // סטטיסטיקות לפי קטגוריה
    const categoryStats: CategoryStats[] = categories.map(category => {
      const categoryTasks = tasks.filter(task => task.categoryId === category.id);
      const completedCategoryTasks = categoryTasks.filter(task => task.completed);
      
      return {
        category,
        total: categoryTasks.length,
        completed: completedCategoryTasks.length,
        completionRate: categoryTasks.length > 0 ? (completedCategoryTasks.length / categoryTasks.length) * 100 : 0
      };
    }).filter(stat => stat.total > 0); // הצג רק קטגוריות עם משימות

    return {
      overall: { totalTasks, completedTasks, overallCompletionRate },
      byPriority: priorityStats,
      byCategory: categoryStats
    };
  }, [tasks, categories]);

  return (
    <div className="space-y-6">
      {/* כותרת וסטטיסטיקה כללית */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {title || defaultTitle}
          </CardTitle>
          <Badge variant="outline" className="text-sm">
            {stats.overall.completedTasks}/{stats.overall.totalTasks} {t('stats.remaining')}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span>{t('stats.overallProgress')}</span>
              <span className="font-medium">{Math.round(stats.overall.overallCompletionRate)}%</span>
            </div>
            <Progress 
              value={stats.overall.overallCompletionRate} 
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* פירוט לפי עדיפות */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('stats.byPriority')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {stats.byPriority.map((priorityStat) => (
              <div
                key={priorityStat.priority}
                className={`p-4 rounded-lg border-2 ${priorityStat.bgColor}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className={priorityStat.color}>
                    {priorityStat.icon}
                  </div>
                  <span className={`font-medium ${priorityStat.color}`}>
                    {priorityConfig[priorityStat.priority].label}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span>{t('task.taskDescription')}</span>
                    <span className="font-medium">
                      {priorityStat.completed}/{priorityStat.total}
                    </span>
                  </div>
                  
                  {priorityStat.total > 0 && (
                    <>
                      <Progress 
                        value={priorityStat.completionRate} 
                        className="h-1.5"
                      />
                      <div className="text-xs text-muted-foreground">
                        {Math.round(priorityStat.completionRate)}% {t('stats.completed')}
                      </div>
                    </>
                  )}
                  
                  {priorityStat.total === 0 && (
                    <div className="text-xs text-muted-foreground">
                      {t('stats.noTasksToShow')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* פירוט לפי קטגוריה */}
      {stats.byCategory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('stats.byCategory')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.byCategory.map((categoryStat) => (
                <div key={categoryStat.category.id} className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-3 mb-3">
                    <div 
                      className={`w-4 h-4 rounded-full ${categoryStat.category.color}`}
                    />
                    <span className="font-medium">{categoryStat.category.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {categoryStat.completed}/{categoryStat.total}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <Progress 
                      value={categoryStat.completionRate} 
                      className="h-2"
                    />
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>{Math.round(categoryStat.completionRate)}% {t('stats.completed')}</span>
                      <span>
                        {categoryStat.total - categoryStat.completed} {t('stats.remaining')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* הודעה אם אין משימות */}
      {stats.overall.totalTasks === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('stats.noTasksToShow')}</h3>
            <p className="text-muted-foreground">
              {t('stats.createTasksToSeeStats')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
