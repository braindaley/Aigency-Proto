import { Badge } from '@/components/ui/badge';
import { Mail, MailOpen, MousePointerClick, AlertCircle, Send, Clock, CheckCircle2, XCircle } from 'lucide-react';
import type { SubmissionStatus } from '@/lib/types';

interface SubmissionStatusBadgeProps {
  status: SubmissionStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function SubmissionStatusBadge({ status, size = 'md', showIcon = true }: SubmissionStatusBadgeProps) {
  const getStatusConfig = (status: SubmissionStatus) => {
    switch (status) {
      case 'draft':
        return {
          label: 'Draft',
          variant: 'secondary' as const,
          icon: Clock,
          className: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        };
      case 'ready':
        return {
          label: 'Ready to Send',
          variant: 'default' as const,
          icon: Mail,
          className: 'bg-blue-100 text-blue-700 hover:bg-blue-200'
        };
      case 'sending':
        return {
          label: 'Sending',
          variant: 'default' as const,
          icon: Send,
          className: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
        };
      case 'sent':
        return {
          label: 'Sent',
          variant: 'default' as const,
          icon: CheckCircle2,
          className: 'bg-green-100 text-green-700 hover:bg-green-200'
        };
      case 'failed':
        return {
          label: 'Failed',
          variant: 'destructive' as const,
          icon: XCircle,
          className: 'bg-red-100 text-red-700 hover:bg-red-200'
        };
      case 'bounced':
        return {
          label: 'Bounced',
          variant: 'destructive' as const,
          icon: AlertCircle,
          className: 'bg-orange-100 text-orange-700 hover:bg-orange-200'
        };
      case 'opened':
        return {
          label: 'Opened',
          variant: 'default' as const,
          icon: MailOpen,
          className: 'bg-purple-100 text-purple-700 hover:bg-purple-200'
        };
      case 'clicked':
        return {
          label: 'Clicked',
          variant: 'default' as const,
          icon: MousePointerClick,
          className: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
        };
      case 'replied':
        return {
          label: 'Replied',
          variant: 'default' as const,
          icon: MailOpen,
          className: 'bg-teal-100 text-teal-700 hover:bg-teal-200'
        };
      default:
        return {
          label: status,
          variant: 'outline' as const,
          icon: Mail,
          className: ''
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs h-5',
    md: 'text-sm h-6',
    lg: 'text-base h-7'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4'
  };

  return (
    <Badge
      variant={config.variant}
      className={`${config.className} ${sizeClasses[size]} flex items-center gap-1.5 px-2.5`}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </Badge>
  );
}

/**
 * Get appropriate status message for display
 */
export function getStatusMessage(status: SubmissionStatus): string {
  switch (status) {
    case 'draft':
      return 'This submission is still being prepared';
    case 'ready':
      return 'Ready to be sent to the carrier';
    case 'sending':
      return 'Currently sending email...';
    case 'sent':
      return 'Email successfully delivered';
    case 'failed':
      return 'Failed to send - please retry';
    case 'bounced':
      return 'Email bounced - check carrier email address';
    case 'opened':
      return 'Carrier has opened the email';
    case 'clicked':
      return 'Carrier clicked on a link in the email';
    case 'replied':
      return 'Carrier has responded';
    default:
      return '';
  }
}
