import {NextIntlClientProvider} from 'next-intl';
import Link from 'next/link';
import LocaleSwitcher from '@/app/components/LocaleSwitcher';

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{locale: 'en' | 'fr'}>;
}) {
  const {locale} = await params;
  const messages = (await import(`../../../messages/${locale}.json`)).default;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <header className="p-4 border-b flex items-center gap-4">
        <Link href={`/${locale}/estimate`} className="font-semibold">OuiGotU</Link>
        <nav className="ml-auto">
          <LocaleSwitcher />
        </nav>
      </header>
      {children}
    </NextIntlClientProvider>
  );
}
