export const RAYDIUM_API = {
  TOKEN_LIST: "https://api.raydium.io/v2/sdk/token/raydium.mainnet.json",
};

const MORALIS_BASE = "https://solana-gateway.moralis.io";

export const MORALIS_API = {
  BASE: MORALIS_BASE,
  PUMPFUN_NEW_TOKENS: (limit: number = 100) =>
    `${MORALIS_BASE}/token/mainnet/exchange/pumpfun/new?limit=${limit}`,
  TOKEN_PRICE: (mint: string) => `${MORALIS_BASE}/token/mainnet/${mint}/price`,
  MULTIPLE_TOKEN_PRICES: `${MORALIS_BASE}/token/mainnet/prices`,
};

export const RUGCHECK_API = {
  BASE: "https://api.rugcheck.xyz/v1/tokens",
  REPORT: (mint: string) => `${RUGCHECK_API.BASE}/${mint}/report`,
};
