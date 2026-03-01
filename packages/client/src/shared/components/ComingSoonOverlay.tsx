import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';

interface ComingSoonOverlayProps {
  title: string;
  description: string;
  icon: ReactNode;
}

export function ComingSoonOverlay({ title, description, icon }: ComingSoonOverlayProps) {
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-background">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />

      <div className="relative z-10 mx-auto max-w-md px-6 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-content2 text-muted-foreground">
          {icon}
        </div>
        <Badge variant="outline" className="mb-4 text-sm">
          Coming Soon
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}
