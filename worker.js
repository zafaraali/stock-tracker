/* global Response */

const YAHOO_ORIGIN = 'https://query1.finance.yahoo.com';
const FRANKFURTER_ORIGIN = 'https://api.frankfurter.dev';
const UPSTREAM_HEADERS = { accept: 'application/json', 'user-agent': 'Mozilla/5.0 ApexFinance/1.0' };

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

export default {
  async fetch(request, env) {
    const incoming = new URL(request.url);

    if (incoming.pathname.startsWith('/api/market-quote/')) {
      const symbol = incoming.pathname.slice('/api/market-quote/'.length);
      if (!symbol || symbol.includes('/') || !/^[A-Za-z0-9.=^_-]+$/.test(symbol)) {
        return jsonResponse({ error: 'Invalid market symbol.' }, 400);
      }

      const target = new URL(`/v8/finance/chart/${encodeURIComponent(symbol)}`, YAHOO_ORIGIN);
      target.search = incoming.search;
      const response = await fetch(target, { headers: UPSTREAM_HEADERS });
      return new Response(response.body, {
        status: response.status,
        headers: { 'content-type': response.headers.get('content-type') || 'application/json', 'cache-control': 'no-store' }
      });
    }

    if (incoming.pathname === '/api/market-search') {
      const target = new URL('/v1/finance/search', YAHOO_ORIGIN);
      target.search = incoming.search;
      const response = await fetch(target, { headers: UPSTREAM_HEADERS });
      return new Response(response.body, {
        status: response.status,
        headers: { 'content-type': response.headers.get('content-type') || 'application/json' }
      });
    }

    if (incoming.pathname === '/api/market-fundamentals') {
      const symbol = incoming.searchParams.get('symbol');
      if (!symbol || !/^[A-Za-z0-9.=^_-]+$/.test(symbol)) return jsonResponse({ error: 'Invalid market symbol.' }, 400);
      const target = new URL('/v7/finance/quote', YAHOO_ORIGIN);
      target.searchParams.set('symbols', symbol);
      const response = await fetch(target, { headers: UPSTREAM_HEADERS });
      return new Response(response.body, {
        status: response.status,
        headers: { 'content-type': response.headers.get('content-type') || 'application/json', 'cache-control': 'no-store' }
      });
    }

    if (incoming.pathname === '/api/fx-rates') {
      const target = new URL('/v2/rates', FRANKFURTER_ORIGIN);
      target.search = incoming.search;
      const response = await fetch(target, { headers: { accept: 'application/json' } });
      return new Response(response.body, {
        status: response.status,
        headers: { 'content-type': response.headers.get('content-type') || 'application/json', 'cache-control': 'no-store' }
      });
    }

    return env.ASSETS.fetch(request);
  }
};
