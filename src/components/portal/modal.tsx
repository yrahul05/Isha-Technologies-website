'use client';

import { useState, type ReactNode } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Trigger button + dialog. `children` receives `close` so a form inside can
 * dismiss the dialog after a successful server action.
 */
export function Modal({
  trigger,
  title,
  description,
  children,
  wide = false,
  triggerVariant = 'primary',
  triggerClassName,
  defaultOpen = false,
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  children: (close: () => void) => ReactNode;
  wide?: boolean;
  triggerVariant?: 'primary' | 'secondary' | 'ghost';
  triggerClassName?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} className={cn('h-10 rounded-lg px-4 text-sm', triggerClassName)}>
          {trigger}
        </Button>
      </DialogTrigger>
      <DialogContent className={cn('max-h-[90vh] overflow-y-auto rounded-2xl border-gray-200 bg-white p-6', wide ? 'sm:max-w-2xl' : 'sm:max-w-lg')}>
        <DialogHeader>
          <DialogTitle className="text-lg font-bold tracking-tight text-slate-900">{title}</DialogTitle>
          {description && <DialogDescription className="text-sm text-slate-500">{description}</DialogDescription>}
        </DialogHeader>
        {open && children(() => setOpen(false))}
      </DialogContent>
    </Dialog>
  );
}
