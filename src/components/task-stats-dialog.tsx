'use client';

import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Calendar,
  TrendingUp,
  Target,
  Activity
} from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import type { Task, Category, Priority } from '@/lib/types';

interface TaskStatsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  tasks: Task[];
  categories: Category[];
  boardName: string;
}

interface TaskStats {
  total: number;
  completed: number;
  pending: number;
  completionRate: number;
}

interface PriorityBreakdown {
  high: TaskStats;
  medium: TaskStats;
  low: TaskStats;
}

interface CategoryBreakdown {
  [categoryId: string]: TaskStats & { category: Category };
}

const priorityConfig = {
  high: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    label: 'גבוהה'
  },
  medium: {
    icon: <Clock className="h-4 w-4" />,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    label: 'בינונית'
  },
  low: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    label: 'נמוכה'
  }
};

function calculateStats(tasks: Task[]): TaskStats {
  const total = tasks.length;
  const completed = tasks.filter(task => task.completed).length;
  const pending = total - completed;
  const completionRate = total > 0 ? (completed / total) * 100 : 0;
  
  return { total, completed, pending, completionRate };
}

export function TaskStatsDialog({ 
  isOpen, 
  onOpenChange, 
  tasks, 
  categories, 
  boardName 
}: TaskStatsDialogProps) {
  const stats = useMemo(() => {
    // סטטיסטיקות כלליות
    const overall = calculateStats(tasks);

    // פירוט לפי עדיפות
    const byPriority: PriorityBreakdown = {
      high: calculateStats(tasks.filter(task => task.priority === 'high')),
      medium: calculateStats(tasks.filter(task => task.priority === 'medium')),
      low: calculateStats(tasks.filter(task => task.priority === 'low'))
    };

    // פירוט לפי קטגוריה
    const byCategory: CategoryBreakdown = {};
    categories.forEach(category => {
      const categoryTasks = tasks.filter(task => task.categoryId === category.id);
      if (categoryTasks.length > 0) {
        byCategory[category.id] = {
          ...calculateStats(categoryTasks),
          category
        };
      }
    });

    // סטטיסטיקות תאריכי יעד
    const now = new Date();
    const overdueTasks = tasks.filter(task => 
      !task.completed && 
      task.dueDate && 
      new Date(task.dueDate) < now
    );
    
    const dueTodayTasks = tasks.filter(task => {
      if (!task.dueDate || task.completed) return false;
      const dueDate = new Date(task.dueDate);
      const today = new Date();
      return dueDate.toDateString() === today.toDateString();
    });

    const upcomingTasks = tasks.filter(task => {
      if (!task.dueDate || task.completed) return false;
      const dueDate = new Date(task.dueDate);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      return dueDate >= tomorrow && dueDate <= nextWeek;
    });

    return {
      overall,
      byPriority,
      byCategory,
      timing: {
        overdue: overdueTasks.length,
        dueToday: dueTodayTasks.length,
        upcoming: upcomingTasks.length
      }
    };
  }, [tasks, categories]);

  const topCategory = useMemo(() => {
    const categoryEntries = Object.values(stats.byCategory);
    if (categoryEntries.length === 0) return null;
    
    return categoryEntries.reduce((top, current) => 
      current.total > top.total ? current : top
    );
  }, [stats.byCategory]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            סטטיסטיקות משימות - {boardName}
          </DialogTitle>
          <DialogDescription>
            סקירה מפורטת של המשימות בלוח לפי עדיפות, קטגוריה ותאריכים
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* סטטיסטיקות כלליות */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 mx-auto mb-2">
                  <Target className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-2xl font-bold">{stats.overall.total}</div>
                <div className="text-sm text-muted-foreground">סה"כ משימות</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 mx-auto mb-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-2xl font-bold">{stats.overall.completed}</div>
                <div className="text-sm text-muted-foreground">הושלמו</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 mx-auto mb-2">
                  <Activity className="h-4 w-4 text-orange-600" />
                </div>
                <div className="text-2xl font-bold">{stats.overall.pending}</div>
                <div className="text-sm text-muted-foreground">בהמתנה</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 mx-auto mb-2">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </div>
                <div className="text-2xl font-bold">{Math.round(stats.overall.completionRate)}%</div>
                <div className="text-sm text-muted-foreground">השלמה</div>
              </CardContent>
            </Card>
          </div>

          {/* פירוט לפי עדיפות */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">פירוט לפי עדיפות</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(['high', 'medium', 'low'] as Priority[]).map((priority) => {
                  const priorityStats = stats.byPriority[priority];
                  const config = priorityConfig[priority];
                  
                  return (
                    <div key={priority} className={`p-4 rounded-lg ${config.bgColor}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={config.color}>
                            {config.icon}
                          </div>
                          <span className={`font-medium ${config.color}`}>
                            עדיפות {config.label}
                          </span>
                        </div>
                        <Badge variant="secondary">
                          {priorityStats.completed}/{priorityStats.total}
                        </Badge>
                      </div>
                      
                      {priorityStats.total > 0 ? (
                        <div className="space-y-2">
                          <Progress 
                            value={priorityStats.completionRate} 
                            className="h-2"
                          />
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>{Math.round(priorityStats.completionRate)}% הושלמו</span>
                            <span>{priorityStats.pending} נותרו</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">אין משימות</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* פירוט לפי קטגוריה */}
          {Object.keys(stats.byCategory).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">פירוט לפי קטגוריה</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.values(stats.byCategory)
                    .sort((a, b) => b.total - a.total)
                    .map((categoryStats) => (
                      <div key={categoryStats.category.id} className="p-4 rounded-lg border bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div 
                              className={`w-4 h-4 rounded-full ${categoryStats.category.color}`}
                            />
                            <span className="font-medium">{categoryStats.category.name}</span>
                            {topCategory?.category.id === categoryStats.category.id && (
                              <Badge variant="default" className="text-xs">
                                הפעילה ביותר
                              </Badge>
                            )}
                          </div>
                          <Badge variant="outline">
                            {categoryStats.completed}/{categoryStats.total}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <Progress 
                            value={categoryStats.completionRate} 
                            className="h-2"
                          />
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>{Math.round(categoryStats.completionRate)}% הושלמו</span>
                            <span>{categoryStats.pending} נותרו</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* סטטיסטיקות תאריכים */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                תאריכי יעד
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-red-50 border border-red-200">
                  <div className="text-2xl font-bold text-red-600">{stats.timing.overdue}</div>
                  <div className="text-sm text-red-600">איחור</div>
                </div>
                
                <div className="text-center p-4 rounded-lg bg-orange-50 border border-orange-200">
                  <div className="text-2xl font-bold text-orange-600">{stats.timing.dueToday}</div>
                  <div className="text-sm text-orange-600">היום</div>
                </div>
                
                <div className="text-center p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="text-2xl font-bold text-blue-600">{stats.timing.upcoming}</div>
                  <div className="text-sm text-blue-600">השבוע הקרוב</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* הודעה אם אין משימות */}
          {stats.overall.total === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">אין משימות בלוח</h3>
                <p className="text-muted-foreground">
                  צור משימות חדשות כדי לראות סטטיסטיקות מפורטות
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
