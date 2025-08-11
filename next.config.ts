import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin({
  locales: ['en', 'fr'],
  defaultLocale: 'en'
});

export default withNextIntl({});
