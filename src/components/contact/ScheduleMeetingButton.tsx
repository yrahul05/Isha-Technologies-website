import { Button, buttonVariants } from '@/components/ui/button';
import { CALENDLY_URL } from '@/data/contact';
import type { VariantProps } from 'class-variance-authority';
import { CalendarDays } from 'lucide-react';

type ScheduleMeetingButtonProps = {
  variant?: VariantProps<typeof buttonVariants>['variant'];
  size?: VariantProps<typeof buttonVariants>['size'];
  className?: string;
  showIcon?: boolean;
};

/**
 * Reusable "Schedule a Meeting" CTA — opens the Isha Technologies Calendly
 * page in a new tab. Centralizes the exact wording, URL and accessible
 * label so every placement (Home, Contact, Footer) stays in sync.
 */
export function ScheduleMeetingButton({
  variant = 'secondary',
  size,
  className,
  showIcon = true,
}: ScheduleMeetingButtonProps) {
  return (
    <Button asChild variant={variant} size={size} className={className}>
      <a
        href={CALENDLY_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Schedule a Meeting with Isha Technologies"
      >
        {showIcon && <CalendarDays />}
        Schedule a Meeting
      </a>
    </Button>
  );
}
