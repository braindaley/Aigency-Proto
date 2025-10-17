/**
 * Mock Email Service
 * Simulates email sending and tracking without real email integration
 */

import { Timestamp } from 'firebase/firestore';
import type { SubmissionAttachment } from '@/lib/types';

interface MockEmailResponse {
  success: boolean;
  emailId: string;
  message: string;
  estimatedDeliveryTime?: number; // milliseconds
}

interface MockEmailOptions {
  to: string;
  from?: string;
  subject: string;
  body: string;
  attachments?: SubmissionAttachment[];
}

/**
 * Generate a realistic-looking mock email ID
 */
function generateMockEmailId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `mock_${timestamp}_${random}`;
}

/**
 * Simulate email validation
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Simulate sending an email
 * Returns immediately with a mock email ID
 */
export async function sendMockEmail(options: MockEmailOptions): Promise<MockEmailResponse> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));

  // Validate email
  if (!isValidEmail(options.to)) {
    return {
      success: false,
      emailId: '',
      message: `Invalid email address: ${options.to}`
    };
  }

  // Simulate occasional failures (5% chance)
  if (Math.random() < 0.05) {
    return {
      success: false,
      emailId: '',
      message: 'Mock email service temporarily unavailable'
    };
  }

  const emailId = generateMockEmailId();

  console.log('📧 MOCK EMAIL SENT:', {
    id: emailId,
    to: options.to,
    subject: options.subject,
    attachments: options.attachments?.length || 0
  });

  return {
    success: true,
    emailId,
    message: 'Email sent successfully (mock)',
    estimatedDeliveryTime: 2000 + Math.random() * 3000 // 2-5 seconds
  };
}

/**
 * Simulate batch email sending
 */
export async function sendMockEmailBatch(
  emails: MockEmailOptions[]
): Promise<MockEmailResponse[]> {
  const results: MockEmailResponse[] = [];

  for (const email of emails) {
    const result = await sendMockEmail(email);
    results.push(result);
  }

  return results;
}

/**
 * Simulate email tracking events
 * In a real app, this would be triggered by webhooks from the email service
 */
export interface MockTrackingEvent {
  emailId: string;
  event: 'delivered' | 'opened' | 'clicked' | 'bounced';
  timestamp: Timestamp;
  metadata?: Record<string, any>;
}

/**
 * Simulate random email interactions over time
 * This would normally come from webhook events
 */
export function simulateEmailTracking(
  emailId: string,
  onEvent: (event: MockTrackingEvent) => void
): () => void {
  const timeouts: NodeJS.Timeout[] = [];

  // Simulate delivery (1-3 seconds after send)
  const deliveryTimeout = setTimeout(() => {
    onEvent({
      emailId,
      event: 'delivered',
      timestamp: Timestamp.now()
    });

    // 60% chance the email gets opened (10-30 seconds after delivery)
    if (Math.random() < 0.6) {
      const openTimeout = setTimeout(() => {
        onEvent({
          emailId,
          event: 'opened',
          timestamp: Timestamp.now()
        });

        // 30% chance they click a link (5-15 seconds after opening)
        if (Math.random() < 0.3) {
          const clickTimeout = setTimeout(() => {
            onEvent({
              emailId,
              event: 'clicked',
              timestamp: Timestamp.now(),
              metadata: {
                url: 'https://example.com/submission-documents',
                linkText: 'View Documents'
              }
            });
          }, 5000 + Math.random() * 10000);
          timeouts.push(clickTimeout);
        }
      }, 10000 + Math.random() * 20000);
      timeouts.push(openTimeout);
    }
  }, 1000 + Math.random() * 2000);
  timeouts.push(deliveryTimeout);

  // 2% chance of bounce (almost immediately)
  if (Math.random() < 0.02) {
    const bounceTimeout = setTimeout(() => {
      onEvent({
        emailId,
        event: 'bounced',
        timestamp: Timestamp.now(),
        metadata: {
          reason: 'Mailbox full',
          bounceType: 'soft'
        }
      });
    }, 500 + Math.random() * 1000);
    timeouts.push(bounceTimeout);
  }

  // Return cleanup function
  return () => {
    timeouts.forEach(timeout => clearTimeout(timeout));
  };
}

/**
 * Get mock email status (for demo purposes)
 */
export function getMockEmailStatus(emailId: string): {
  status: string;
  deliveredAt?: Date;
  opens: number;
  clicks: number;
} {
  // In a real app, this would query the email service API
  // For mock, return random realistic data
  const wasDelivered = Math.random() > 0.05;

  if (!wasDelivered) {
    return {
      status: 'bounced',
      opens: 0,
      clicks: 0
    };
  }

  const opens = Math.random() > 0.4 ? Math.floor(Math.random() * 3) + 1 : 0;
  const clicks = opens > 0 && Math.random() > 0.7 ? Math.floor(Math.random() * 2) + 1 : 0;

  return {
    status: clicks > 0 ? 'clicked' : opens > 0 ? 'opened' : 'delivered',
    deliveredAt: new Date(Date.now() - Math.random() * 86400000), // Last 24 hours
    opens,
    clicks
  };
}

/**
 * Mock function to simulate checking for replies
 * In real implementation, this would parse incoming emails via webhook
 */
export function simulateEmailReply(
  emailId: string,
  carrierName: string
): {
  hasReply: boolean;
  reply?: {
    from: string;
    subject: string;
    body: string;
    receivedAt: Date;
  };
} {
  // 15% chance of receiving a reply
  if (Math.random() < 0.15) {
    const replyTemplates = [
      `Thank you for the submission. We are reviewing the information and will get back to you within 2-3 business days.`,
      `We have received your workers' compensation submission for TWR Enterprises. Our underwriting team is currently reviewing the materials. We may need additional information regarding the loss history.`,
      `Thanks for thinking of ${carrierName}. Unfortunately, we are not taking on new construction risks at this time due to capacity constraints.`,
      `We appreciate the submission. The account looks interesting. Can you provide more details about their safety programs and any recent OSHA citations?`,
      `Submission received. We'll need updated loss runs for the past 3 years and current payroll breakdown by class code to proceed with quoting.`
    ];

    return {
      hasReply: true,
      reply: {
        from: `underwriting@${carrierName.toLowerCase().replace(/\s+/g, '')}.com`,
        subject: `RE: Workers' Comp Renewal Submission: TWR Enterprises`,
        body: replyTemplates[Math.floor(Math.random() * replyTemplates.length)],
        receivedAt: new Date(Date.now() - Math.random() * 43200000) // Last 12 hours
      }
    };
  }

  return { hasReply: false };
}

/**
 * Format email body from markdown to HTML (simplified)
 */
export function formatEmailBody(markdown: string): string {
  // Very basic markdown to HTML conversion for mock purposes
  // In production, use a proper markdown library
  let html = markdown
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  return `<p>${html}</p>`;
}
