import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getRootDomain(hostname: string): string {
  if (hostname.includes('localhost')) {
    const parts = hostname.split('.');
    return parts.includes('localhost') ? 'localhost:9002' : parts.slice(-1)[0];
  }
  // Handle multi-part TLDs
  if (hostname.endsWith('.com.ar') || hostname.endsWith('.co.uk') || hostname.endsWith('.com.mx')) {
    const parts = hostname.split('.');
    return parts.length >= 3 ? parts.slice(-3).join('.') : hostname;
  }
  const parts = hostname.split('.');
  return parts.length > 2 ? parts.slice(-2).join('.') : hostname;
}

export function getSubdomain(hostname: string): string | null {
  const root = getRootDomain(hostname);
  if (hostname === root || hostname === `www.${root}`) return null;
  if (hostname.includes('localhost')) {
    const parts = hostname.split('.');
    return parts.length > 1 && parts[0] !== 'www' ? parts[0] : null;
  }
  const sub = hostname.replace(`.${root}`, '');
  return sub !== 'www' ? sub : null;
}
