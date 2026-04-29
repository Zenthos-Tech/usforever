import { escapeHtml } from '../utils/helpers';

/**
 * Build an Android Intent URL that targets the installed app explicitly.
 * Falls back via `S.browser_fallback_url` if the app isn't installed.
 */
export function buildAndroidIntentUrl(appUrl: string): string {
  if (!appUrl.startsWith('usforever://')) return '';
  const path = appUrl.slice('usforever://'.length);
  const fallback = encodeURIComponent(appUrl);
  return `intent://${path}#Intent;scheme=usforever;package=com.anonymous.WeddingApp;S.browser_fallback_url=${fallback};end`;
}

/**
 * Render the tiny HTML page that bounces the browser into the deep-linked
 * mobile app. Lifted out of routes/shareLink.ts so the route handler stays
 * focused on auth + DB lookup.
 */
export function renderPage(args: {
  title?: string;
  appUrl: string;
  expoUrl?: string;
  androidIntentUrl?: string;
  error?: string;
}): string {
  const st = escapeHtml(args.title || 'Open in UsForever');
  const se = args.error
    ? `<div style="color:#c00;font-size:13px">${escapeHtml(args.error)}</div>`
    : '';
  const intentUrl = args.androidIntentUrl || buildAndroidIntentUrl(args.appUrl);
  const saIntent = escapeHtml(intentUrl || args.appUrl);

  // Android: use the intent URL with the explicit package, bypassing chooser.
  // iOS / desktop: fall through to the plain usforever:// scheme.
  const iUrl = JSON.stringify(intentUrl);
  const aUrl = JSON.stringify(args.appUrl);
  const headScript = args.appUrl
    ? '<script>(function(){' +
      'var isAnd=/android/i.test(navigator.userAgent);' +
      'var u=isAnd?' + iUrl + ':' + aUrl + ';' +
      'if(u){window.location.replace(u);}' +
      '})();</script>'
    : '';

  return (
    `<!doctype html><html><head><meta charset="utf-8"/>` +
    `<meta name="viewport" content="width=device-width,initial-scale=1"/>` +
    `<title>${st}</title>` +
    headScript +
    `<style>body{font-family:system-ui;margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}.c{max-width:500px;border:1px solid #eee;border-radius:16px;padding:20px}a.b{display:block;padding:12px;border-radius:12px;text-align:center;background:#111;color:#fff;font-weight:700;text-decoration:none;margin-top:10px}</style>` +
    `</head><body><div class="c"><h3>${st}</h3>${se}` +
    (args.appUrl ? `<a class="b" href="${saIntent}">Open in UsForever</a>` : '') +
    `</div></body></html>`
  );
}
