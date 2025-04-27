/**
 * Environment variables with proper fallbacks
 * Note: All Vite env variables are prefixed with VITE_
 */

export const ENV = {
  /**
   * Solana RPC endpoint - QuikNode or fallback to public endpoint
   */
  SOLANA_ENDPOINT: import.meta.env.VITE_SOLANA_ENDPOINT || "",
  /**
   * Solana WebSocket endpoint - QuikNode
   */
  SOLANA_WEBSOCKET: import.meta.env.VITE_SOLANA_WEBSOCKET || "",

  /**
   * Moralis API Key for accessing Moralis services
   */
  MORALIS_API_KEY: import.meta.env.VITE_MORALIS_API_KEY || "",
};
