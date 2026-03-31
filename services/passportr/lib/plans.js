const PLANS = {
  single_tier1: {
    tier: 1,
    maxHops: 1,
    maxVenuesPerHop: 10,
    isSingle: true,
    priceEnvVar: 'STRIPE_PRICE_TIER1_SINGLE',
    label: 'Single Hop — Tier 1',
    amount: 4900,
  },
  single_tier2: {
    tier: 2,
    maxHops: 1,
    maxVenuesPerHop: null,
    isSingle: true,
    priceEnvVar: 'STRIPE_PRICE_TIER2_SINGLE',
    label: 'Single Hop — Tier 2',
    amount: 7900,
  },
  occasional_tier1: {
    tier: 1,
    maxHops: 3,
    maxVenuesPerHop: 10,
    isSingle: false,
    priceEnvVar: 'STRIPE_PRICE_TIER1_OCCASIONAL',
    label: 'Occasional — Tier 1 (up to 3 hops/year)',
    amount: 7900,
  },
  occasional_tier2: {
    tier: 2,
    maxHops: 3,
    maxVenuesPerHop: null,
    isSingle: false,
    priceEnvVar: 'STRIPE_PRICE_TIER2_OCCASIONAL',
    label: 'Occasional — Tier 2 (up to 3 hops/year)',
    amount: 12900,
  },
  regular_tier1: {
    tier: 1,
    maxHops: 12,
    maxVenuesPerHop: 10,
    isSingle: false,
    priceEnvVar: 'STRIPE_PRICE_TIER1_REGULAR',
    label: 'Regular — Tier 1 (up to 12 hops/year)',
    amount: 12900,
  },
  regular_tier2: {
    tier: 2,
    maxHops: 12,
    maxVenuesPerHop: null,
    isSingle: false,
    priceEnvVar: 'STRIPE_PRICE_TIER2_REGULAR',
    label: 'Regular — Tier 2 (up to 12 hops/year)',
    amount: 18900,
  },
  unlimited_tier1: {
    tier: 1,
    maxHops: null,
    maxVenuesPerHop: 10,
    isSingle: false,
    priceEnvVar: 'STRIPE_PRICE_TIER1_UNLIMITED',
    label: 'Unlimited — Tier 1',
    amount: 17900,
  },
  unlimited_tier2: {
    tier: 2,
    maxHops: null,
    maxVenuesPerHop: null,
    isSingle: false,
    priceEnvVar: 'STRIPE_PRICE_TIER2_UNLIMITED',
    label: 'Unlimited — Tier 2',
    amount: 24900,
  },
};

function getPlanConfig(planKey) {
  return PLANS[planKey] || null;
}

function getPriceId(planKey) {
  const plan = PLANS[planKey];
  if (!plan) return null;
  return process.env[plan.priceEnvVar] || null;
}

function getAllPlans() {
  return PLANS;
}

module.exports = { getPlanConfig, getPriceId, getAllPlans };
