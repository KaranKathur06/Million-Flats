import { headers } from 'next/headers';

export function isSearchBot(): boolean {
  try {
    const headersList = headers();
    const userAgent = (headersList.get('user-agent') || '').toLowerCase();
    
    const botIdentifiers = [
      'googlebot',
      'bingbot',
      'yandexbot',
      'duckduckbot',
      'slurp',
      'baiduspider',
      'ia_archiver',
      'facebot',
      'facebookexternalhit',
      'twitterbot',
      'rogerbot',
      'linkedinbot',
      'embedly',
      'quora link preview',
      'showyoubot',
      'outbrain',
      'pinterest',
      'slackbot',
      'vkshare',
      'w3c_validator',
      'redditbot',
      'applebot',
      'whatsapp',
      'flipboard',
      'tumblr',
      'bitlybot',
      'skypeuripreview',
      'nuzzel',
      'discordbot',
      'telegrambot',
    ];

    return botIdentifiers.some(bot => userAgent.includes(bot));
  } catch {
    return false;
  }
}
