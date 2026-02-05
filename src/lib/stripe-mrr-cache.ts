// ============================================================
// Stripe MRR Data Cache
// ============================================================
//
// Caches Stripe subscription and invoice data to avoid
// excessive API calls on every page load.
// Cache TTL: 5 minutes
// ============================================================

import { stripe } from './stripe';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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

/**
 * Fetches Stripe subscription data with caching.
 * Returns cached data if still valid, otherwise fetches fresh data.
 * Uses a pending promise to prevent duplicate concurrent fetches.
 */
export async function getStripeMRRData(): Promise<CachedMRRData> {
  const now = Date.now();

  // Return cached data if still valid
  if (cachedData && (now - cachedData.fetchedAt) < CACHE_TTL_MS) {
    const ageSeconds = Math.round((now - cachedData.fetchedAt) / 1000);
    console.log(`[Stripe Cache] HIT - returning cached data (${ageSeconds}s old)`);
    return cachedData;
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
          recurring: item.price.recurring ? { interval: item.price.recurring.interval } : null,
        },
        quantity: item.quantity,
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

  console.log(`[Stripe Cache] Populated cache with ${subscriptions.length} subscriptions, MRR: $${cachedData.currentMRR}`);
  return cachedData;
}

/**
 * Fetches all paid invoices with caching.
 * Used for net volume calculations.
 */
let cachedInvoices: { data: { created: number; amount_paid: number }[]; fetchedAt: number } | null = null;
let pendingInvoiceFetch: Promise<{ created: number; amount_paid: number }[]> | null = null;

export async function getStripeInvoices(): Promise<{ created: number; amount_paid: number }[]> {
  const now = Date.now();

  if (cachedInvoices && (now - cachedInvoices.fetchedAt) < CACHE_TTL_MS) {
    const ageSeconds = Math.round((now - cachedInvoices.fetchedAt) / 1000);
    console.log(`[Invoice Cache] HIT - returning cached data (${ageSeconds}s old)`);
    return cachedInvoices.data;
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
