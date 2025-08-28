'use client';

import { Logo } from '@/components/logo';
import { Button } from './ui/button';
import { LogOut, PlusCircle, Moon, Sun, Monitor, Share2, BarChart3 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from './auth-provider';
import { useTheme } from 'next-themes';
import { SidebarTrigger } from './ui/sidebar';
import { InvitationsPopover } from './invitations-popover';
import { ExportExcel } from './export-excel';
import { LanguageSelector } from './language-selector';
import { useI18n } from '@/hooks/use-i18n';
import type { BoardInvitation, Task, Category, BoardMember } from '@/lib/types';

interface HeaderProps {
  onAddTaskClick: () => void;
  onSignOut: () => void;
  onShareClick: () => void;
  onStatsClick: () => void;
  isBoardSelected: boolean;
  isReadOnly?: boolean;
  invitations: BoardInvitation[];
  onInvitationAction: (action: 'accept' | 'decline', invitation: BoardInvitation) => void;
  // Export Excel props
  tasks: Task[];
  categories: Category[];
  boardMembers: BoardMember[];
  boardName: string;
}

export function Header({ 
  onAddTaskClick, 
  onSignOut, 
  onShareClick, 
  onStatsClick,
  isBoardSelected, 
  isReadOnly = false,
  invitations,
  onInvitationAction,
  tasks,
  categories,
  boardMembers,
  boardName
}: HeaderProps) {
    const { user } = useAuth();
    const { setTheme } = useTheme();
    const { t } = useI18n();
    const userInitials = user?.email?.charAt(0).toUpperCase() ?? '?';

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Logo />
        </div>
        <div className="md:hidden">
          <SidebarTrigger />
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
            <ExportExcel 
              tasks={tasks}
              categories={categories}
              boardMembers={boardMembers}
              boardName={boardName}
            />
            <Button 
              variant="outline" 
              onClick={onStatsClick} 
              disabled={!isBoardSelected}
              size="sm"
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              {t('header.stats')}
            </Button>
            <Button onClick={onAddTaskClick} disabled={!isBoardSelected || isReadOnly}>
                <PlusCircle className="mr-2 h-4 w-4" />
                {t('header.addTask')}
            </Button>
            <Button variant="outline" onClick={onShareClick} disabled={!isBoardSelected}>
                <Share2 className="mr-2 h-4 w-4" />
                {t('header.share')}
            </Button>
             <InvitationsPopover 
                invitations={invitations} 
                onInvitationAction={onInvitationAction}
            />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-9 w-9">
                   <AvatarImage src={user?.photoURL ?? undefined} alt={user?.displayName ?? "User"} />
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.displayName ?? 'User'}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
               <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 mr-2" />
                  <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 mr-2" />
                  <span>{t('header.theme')}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => setTheme("light")}>
                      <Sun className="mr-2 h-4 w-4" />
                      <span>{t('header.light')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("dark")}>
                      <Moon className="mr-2 h-4 w-4" />
                      <span>{t('header.dark')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("system")}>
                      <Monitor className="mr-2 h-4 w-4" />
                      <span>{t('header.system')}</span>
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t('header.signOut')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
