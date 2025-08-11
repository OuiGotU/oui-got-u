'use client';
import {usePathname} from 'next/navigation';
import Link from 'next/link';

const LOCALES = ['en','fr'] as const;

function toLocalePath(pathname: string, target: 'en'|'fr') {
  if (!pathname) return `/${target}`;
  const parts = pathname.split('/');
  if (parts[0] !== '') parts.unshift('');     // ensure leading slash
  if (LOCALES.includes(parts[1] as any)) {
    parts[1] = target;                         // replace existing /en or /fr
  } else {
    parts.splice(1, 0, target);                // prefix missing locale
  }
  return parts.join('/') || `/${target}`;
}

export default function LocaleSwitcher() {
  const pathname = usePathname() || '/en/estimate';
  return (
    <div className="inline-flex items-center gap-2 rounded-full border px-2 py-1">
      <Link className="text-xs" href={toLocalePath(pathname, 'en')}>EN</Link>
      <span className="opacity-40">/</span>
      <Link className="text-xs" href={toLocalePath(pathname, 'fr')}>FR</Link>
    </div>
  );
}
