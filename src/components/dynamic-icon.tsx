'use client';

import * as Icons from 'lucide-react';

type IconName = keyof typeof Icons;

interface DynamicIconProps extends Icons.LucideProps {
  name: IconName | string;
}

export function DynamicIcon({ name, ...props }: DynamicIconProps) {
  const LucideIcon = Icons[name as IconName] as Icons.LucideIcon;

  if (!LucideIcon) {
    return <Icons.HelpCircle {...props} />; // Fallback icon
  }

  return <LucideIcon {...props} />;
}
