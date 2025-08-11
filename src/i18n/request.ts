import {getRequestConfig} from 'next-intl/server';

export default getRequestConfig(async ({locale}) => {
  const supported = ['en','fr'] as const;
  const effective = (supported as readonly string[]).includes(locale) ? locale : 'en';
  const messages = (await import(`../../messages/${effective}.json`)).default;
  return {locale: effective, messages};
});
