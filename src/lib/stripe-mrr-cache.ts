// ============================================================
// Stripe MRR Data Cache
// ============================================================
//
// Caches Stripe subscription and invoice data in the database
// to avoid excessive API calls on every page load.
// Cache TTL: 30 minutes (persists across serverless cold starts)
// ============================================================

import { stripe } from './stripe';
import { dbPool } from './prisma';

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface SubscriptionData {
  id: string;
  status: string;
  created: number;
  canceled_at: number | null;
  ended_at: number | null;
  customer: string | null;
  monthlyAmount: number;
  items: {
    price: {
      unit_amount: number | null;
      recurring: { interval: string } | null;
    };
    quantity: number | null;
  }[];
}

interface CachedMRRData {
  subscriptions: SubscriptionData[];
  currentMRR: number;
  activeClientCount: number;
  fetchedAt: number;
}

let cachedData: CachedMRRData | null = null;
let pendingFetch: Promise<CachedMRRData> | null = null;

// Database cache key
const DB_CACHE_KEY = 'stripe_mrr_data';

/**
 * Load cached data from database
 */
async function loadCacheFromDB(): Promise<CachedMRRData | null> {
  try {
    const result = await dbPool.query(
      `SELECT data, fetched_at FROM system_cache WHERE cache_key = $1`,
      [DB_CACHE_KEY]
    );
    if (result.rows.length > 0) {
      const row = result.rows[0];
      const fetchedAt = new Date(row.fetched_at).getTime();
      return {
        ...row.data,
        fetchedAt,
      };
    }
  } catch (error) {
    // Table might not exist, ignore
    console.log('[Stripe Cache] DB cache not available');
  }
  return null;
}

/**
 * Save cached data to database
 */
async function saveCacheToDB(data: CachedMRRData): Promise<void> {
  try {
    // Create table if not exists
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS system_cache (
        cache_key VARCHAR(100) PRIMARY KEY,
        data JSONB NOT NULL,
        fetched_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await dbPool.query(`
      INSERT INTO system_cache (cache_key, data, fetched_at, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (cache_key) DO UPDATE SET
        data = $2,
        fetched_at = $3,
        updated_at = NOW()
    `, [DB_CACHE_KEY, JSON.stringify({
      subscriptions: data.subscriptions,
      currentMRR: data.currentMRR,
      activeClientCount: data.activeClientCount,
    }), new Date(data.fetchedAt).toISOString()]);
  } catch (error) {
    console.error('[Stripe Cache] Failed to save to DB:', error);
  }
}

/**
 * Fetches Stripe subscription data with caching.
 * Returns cached data if still valid, otherwise fetches fresh data.
 * Uses database-backed caching to persist across serverless cold starts.
 */
export async function getStripeMRRData(forceRefresh = false): Promise<CachedMRRData> {
  const now = Date.now();

  // Check in-memory cache first (fastest)
  if (!forceRefresh && cachedData && (now - cachedData.fetchedAt) < CACHE_TTL_MS) {
    const ageSeconds = Math.round((now - cachedData.fetchedAt) / 1000);
    console.log(`[Stripe Cache] MEMORY HIT - returning cached data (${ageSeconds}s old)`);
    return cachedData;
  }

  // Check database cache (persists across cold starts)
  if (!forceRefresh) {
    const dbCache = await loadCacheFromDB();
    if (dbCache && (now - dbCache.fetchedAt) < CACHE_TTL_MS) {
      const ageSeconds = Math.round((now - dbCache.fetchedAt) / 1000);
      console.log(`[Stripe Cache] DB HIT - returning cached data (${ageSeconds}s old)`);
      cachedData = dbCache; // Populate memory cache
      return dbCache;
    }
  }

  // If another request is already fetching, wait for it
  if (pendingFetch) {
    console.log(`[Stripe Cache] WAIT - another request is fetching, waiting...`);
    return pendingFetch;
  }

  console.log(`[Stripe Cache] MISS - fetching fresh data from Stripe...`);

  // Create the fetch promise and store it
  pendingFetch = fetchStripeData(now);

  try {
    const result = await pendingFetch;
    return result;
  } finally {
    pendingFetch = null;
  }
}

async function fetchStripeData(now: number): Promise<CachedMRRData> {
  // Fetch fresh data from Stripe
  const allSubscriptions = await stripe.subscriptions.list({
    status: 'all',
    limit: 100,
  });

  const subscriptions: SubscriptionData[] = [];
  const activeClientIds = new Set<string>();
  let currentMRR = 0;

  // Fetch invoice data for each subscription
  for (const sub of allSubscriptions.data) {
    let monthlyAmount = 0;

    // Get the actual amount from the most recent invoice
    const invoices = await stripe.invoices.list({
      subscription: sub.id,
      status: 'paid',
      limit: 1,
    });

    if (invoices.data.length > 0) {
      monthlyAmount = invoices.data[0].amount_paid / 100;
    } else {
      // Fallback to subscription item prices if no invoice
      for (const item of sub.items.data) {
        const price = item.price;
        const quantity = item.quantity || 1;
        const unitAmount = price.unit_amount || 0;

        if (price.recurring?.interval === 'month') {
          monthlyAmount += (unitAmount * quantity) / 100;
        } else if (price.recurring?.interval === 'year') {
          monthlyAmount += (unitAmount * quantity) / 100 / 12;
        }
      }
    }

    subscriptions.push({
      id: sub.id,
      status: sub.status,
      created: sub.created,
      canceled_at: sub.canceled_at,
      ended_at: sub.ended_at,
      customer: typeof sub.customer === 'string' ? sub.customer : null,
      monthlyAmount,
      items: sub.items.data.map(item => ({
        price: {
          unit_amount: item.price.unit_amount,
          recurring: item.price.recurring ? { interval: item.price.recurring.interval as string } : null,
        },
        quantity: item.quantity ?? null,
      })),
    });

    // Track active clients and MRR
    if (sub.status === 'active' || sub.status === 'trialing') {
      currentMRR += monthlyAmount;
      if (sub.customer && typeof sub.customer === 'string') {
        activeClientIds.add(sub.customer);
      }
    }
  }

  cachedData = {
    subscriptions,
    currentMRR: Math.round(currentMRR),
    activeClientCount: activeClientIds.size,
    fetchedAt: now,
  };

  // Save to database for persistence across cold starts
  await saveCacheToDB(cachedData);

  console.log(`[Stripe Cache] Populated cache with ${subscriptions.length} subscriptions, MRR: $${cachedData.currentMRR}`);
  return cachedData;
}

/**
 * Fetches all paid invoices with caching.
 * Used for net volume calculations.
 */
let cachedInvoices: { data: { created: number; amount_paid: number }[]; fetchedAt: number } | null = null;
let pendingInvoiceFetch: Promise<{ created: number; amount_paid: number }[]> | null = null;

const DB_INVOICE_CACHE_KEY = 'stripe_invoice_data';

async function loadInvoiceCacheFromDB(): Promise<{ data: { created: number; amount_paid: number }[]; fetchedAt: number } | null> {
  try {
    const result = await dbPool.query(
      `SELECT data, fetched_at FROM system_cache WHERE cache_key = $1`,
      [DB_INVOICE_CACHE_KEY]
    );
    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        data: row.data,
        fetchedAt: new Date(row.fetched_at).getTime(),
      };
    }
  } catch {
    // Table might not exist, ignore
  }
  return null;
}

async function saveInvoiceCacheToDB(data: { data: { created: number; amount_paid: number }[]; fetchedAt: number }): Promise<void> {
  try {
    await dbPool.query(`
      INSERT INTO system_cache (cache_key, data, fetched_at, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (cache_key) DO UPDATE SET
        data = $2,
        fetched_at = $3,
        updated_at = NOW()
    `, [DB_INVOICE_CACHE_KEY, JSON.stringify(data.data), new Date(data.fetchedAt).toISOString()]);
  } catch (error) {
    console.error('[Invoice Cache] Failed to save to DB:', error);
  }
}

export async function getStripeInvoices(forceRefresh = false): Promise<{ created: number; amount_paid: number }[]> {
  const now = Date.now();

  // Check memory cache first
  if (!forceRefresh && cachedInvoices && (now - cachedInvoices.fetchedAt) < CACHE_TTL_MS) {
    const ageSeconds = Math.round((now - cachedInvoices.fetchedAt) / 1000);
    console.log(`[Invoice Cache] MEMORY HIT - returning cached data (${ageSeconds}s old)`);
    return cachedInvoices.data;
  }

  // Check database cache
  if (!forceRefresh) {
    const dbCache = await loadInvoiceCacheFromDB();
    if (dbCache && (now - dbCache.fetchedAt) < CACHE_TTL_MS) {
      const ageSeconds = Math.round((now - dbCache.fetchedAt) / 1000);
      console.log(`[Invoice Cache] DB HIT - returning cached data (${ageSeconds}s old)`);
      cachedInvoices = dbCache;
      return dbCache.data;
    }
  }

  // If another request is already fetching, wait for it
  if (pendingInvoiceFetch) {
    console.log(`[Invoice Cache] WAIT - another request is fetching, waiting...`);
    return pendingInvoiceFetch;
  }

  console.log(`[Invoice Cache] MISS - fetching fresh data from Stripe...`);
  pendingInvoiceFetch = fetchInvoiceData(now);

  try {
    return await pendingInvoiceFetch;
  } finally {
    pendingInvoiceFetch = null;
  }
}

async function fetchInvoiceData(now: number): Promise<{ created: number; amount_paid: number }[]> {
  const allInvoices = await stripe.invoices.list({
    status: 'paid',
    limit: 100,
  });

  cachedInvoices = {
    data: allInvoices.data.map(inv => ({
      created: inv.created,
      amount_paid: inv.amount_paid,
    })),
    fetchedAt: now,
  };

  // Save to database
  await saveInvoiceCacheToDB(cachedInvoices);

  console.log(`[Invoice Cache] Populated cache with ${cachedInvoices.data.length} invoices`);
  return cachedInvoices.data;
}

/**
 * Invalidate the cache (call after webhooks update subscription data)
 */
export function invalidateStripeMRRCache(): void {
  cachedData = null;
  cachedInvoices = null;
}
