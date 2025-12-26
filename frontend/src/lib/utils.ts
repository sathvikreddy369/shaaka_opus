import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getDiscountPercentage(price: number, discountPrice: number): number {
  return Math.round(((price - discountPrice) / price) * 100);
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function getOrderStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PLACED: 'bg-yellow-100 text-yellow-800',
    PAYMENT_PENDING: 'bg-orange-100 text-orange-800',
    PAYMENT_FAILED: 'bg-red-100 text-red-800',
    CONFIRMED: 'bg-blue-100 text-blue-800',
    PACKED: 'bg-indigo-100 text-indigo-800',
    READY_TO_DELIVER: 'bg-purple-100 text-purple-800',
    HANDED_TO_AGENT: 'bg-cyan-100 text-cyan-800',
    DELIVERED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
    REFUND_INITIATED: 'bg-orange-100 text-orange-800',
    REFUNDED: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function getOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PLACED: 'Placed',
    PAYMENT_PENDING: 'Payment Pending',
    PAYMENT_FAILED: 'Payment Failed',
    CONFIRMED: 'Confirmed',
    PACKED: 'Packed',
    READY_TO_DELIVER: 'Ready to Deliver',
    HANDED_TO_AGENT: 'Out for Delivery',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
    REFUND_INITIATED: 'Refund Initiated',
    REFUNDED: 'Refunded',
  };
  return labels[status] || status;
}

export function generateOrderId(): string {
  return 'ORD' + Date.now().toString(36).toUpperCase();
}
