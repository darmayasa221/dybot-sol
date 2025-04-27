import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "motion/react";
import {
  MdSettings,
  MdPause,
  MdPlayArrow,
  MdRefresh,
  MdDeleteOutline,
  MdAdd,
  MdInfo,
  MdWarning,
  MdSell,
} from "react-icons/md";
import { toast } from "react-toastify";

// Import components
import TokenDetailModal from "../../components/tokens/TokenDetailModal";
import PositionsList from "../../components/positions/PositionsList";
import TransactionsList from "../../components/transactions/TransactionsList";
import { TokenTable, TokenScanResult } from "../../components/tokens";
import SellModal from "../../components/positions/SellModal";

// Import hooks
import useBot from "../../hooks/useBot";
import useWallet from "../../hooks/useWalletService";
import usePositions from "../../hooks/usePositions";
import { useTransactionHistory } from "../../hooks/useTransactionHistory";

// Import services
import { sniperTradingService } from "../../services/domain/SniperTradingService";
import { tokenScannerService } from "../../services/domain/TokenScannerService";
import { Position, CoinStatus } from "../../types/types";
import { rugCheckService } from "../../services/domain/RugCheckService";
import { ErrorUtils } from "../../services/utils/ErrorUtils";

// Helper function to format time ago
function formatTimeAgo(timestamp: number): string {
  if (!timestamp) return "Just now";

  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

const Bot: React.FC = () => {
  // Use bot hook for bot functionality
  const {
    isInitialized,
    isInitializing,
    scannerConfig,
    isActive,
    isPaused,
    stats,
    statusText,
    manualScanLoading,
    formattedActiveTime,
    initializeBot,
    startBot,
    pauseBot,
    stopBot,
    updateScannerConfig,
    triggerManualScan,
  } = useBot();

  // Use wallet hook for wallet data with renamed variables
  const {
    isConnected,
    balance: walletBalance,
    solPrice: walletSolPrice,
  } = useWallet();

  // Use positions hook with renamed variables to avoid conflicts
  const {
    sortedPositions,
    isLoading: positionsLoading,
    refreshPositions: refreshPositionsData,
    manualRefreshLoading: positionsRefreshLoading,
    sellPosition,
  } = usePositions();

  // NEW: Use transaction history hook
  const {
    transactions,
    isLoading: transactionsLoading,
    error: transactionsError,
    lastUpdated: transactionsLastUpdated,
    refreshTransactions,
  } = useTransactionHistory({
    includePositions: true,
    autoRefresh: true,
    refreshInterval: 30000, // 30 seconds
  });

  // State
  const [activeTab, setActiveTab] = useState<string>("positions");
  const [localScannerConfig, setLocalScannerConfig] = useState(scannerConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [isTokensLoading, setIsTokensLoading] = useState(true);
  const [scanResults, setScanResults] = useState<TokenScanResult[]>([]);
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const [selectedToken, setSelectedToken] = useState<TokenScanResult | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(
    null
  );
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);

  // Initialize and load data
  useEffect(() => {
    const initialize = async () => {
      if (isInitializing || !isConnected) return;
      setIsLoading(true);

      try {
        if (!isInitialized) {
          await initializeBot();
        }

        // Load initial data
        loadInitialData();

        // Load scanned tokens
        loadScannedTokens();
      } catch (error) {
        const formattedError = ErrorUtils.formatError(error, "Bot");
        console.error("Failed to initialize:", formattedError.message);
        toast.error("Failed to initialize trading services");
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [isInitialized, isInitializing, isConnected, initializeBot]);

  // Update local scanner config when context scanner config changes
  useEffect(() => {
    setLocalScannerConfig(scannerConfig);
  }, [scannerConfig]);

  // Subscribe to trading service events
  useEffect(() => {
    if (!isInitialized || !isConnected) return;

    // Subscribe to scanner events for token updates
    const scanCompleteSub = tokenScannerService.subscribe(
      "scan-complete",
      (data) => {
        // Reload token data when scan completes
        loadScannedTokens();
        setLastScanTime(Date.now());
      }
    );

    // Subscribe to new token events
    const newTokenSub = tokenScannerService.subscribe("new-token", (token) => {
      // Could add the token directly to the list but we'll reload all for consistency
      loadScannedTokens();
    });

    // Cleanup subscriptions
    return () => {
      scanCompleteSub();
      newTokenSub();
    };
  }, [isInitialized, isConnected]);

  // Load initial data
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // Any other initialization logic
      // Transaction data is now handled by the hook
    } catch (error) {
      console.error("Failed to load initial data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load scanned tokens from token scanner service
  const loadScannedTokens = async () => {
    setIsTokensLoading(true);
    try {
      // Get discovered tokens from scanner
      const discoveredTokens = tokenScannerService.getDiscoveredTokens();

      // Transform into TokenScanResult format
      const scanResults: TokenScanResult[] = await Promise.all(
        discoveredTokens.map(async (token) => {
          // Get rug check data for the token - now with enhanced data
          const rugCheckData = await rugCheckService.checkRugScore(token.mint);

          // Count social media links
          const socialMediaCount = [
            token.website,
            token.twitter,
            token.telegram,
          ].filter(Boolean).length;

          // Get actual liquidity status from rugcheck instead of random
          const liquidityLocked = (rugCheckData.liquidityUSD ?? 0) > 0;

          // Use verification data from the enhanced RugCheck API
          const isVerified = rugCheckData.verification?.jupVerified || false;

          // Top holder concentration from actual data
          const topHolderConcentration =
            rugCheckData.topHolders && rugCheckData.topHolders.length > 0
              ? rugCheckData.topHolders[0].percentage
              : 0;

          // Determine risk using multiple factors not just market cap
          const isHighRisk =
            rugCheckData.score > 65 || // High risk score
            topHolderConcentration > 80 || // High concentration
            token.marketCapSol * walletSolPrice < 100000; // Low market cap (less than $100k)

          return {
            id: token.mint,
            mint: token.mint,
            name: token.name || "Unknown",
            symbol: token.symbol || "N/A",
            priceUSD: token.priceUSD,
            marketCap: token.marketCapSol * walletSolPrice,
            liquidityLocked, // Now using actual data
            liquidityUSD:
              rugCheckData.liquidityUSD || token.liquiditySol * walletSolPrice,
            socialMediaCount,
            priceChange24h: token.priceChange24h || 0,
            hasTwitter: !!token.twitter,
            hasTelegram: !!token.telegram,
            hasWebsite: !!token.website,
            hasDiscord: false, // Not in your data model yet
            rugScore: rugCheckData.score || 50,
            scanTime: Date.now(),
            isHighRisk,
            isVerified, // New field from enhanced RugCheck
            topHolderConcentration, // New field from enhanced RugCheck
            rugRisks: rugCheckData.risks || [], // Detailed risk factors
            isRugged: rugCheckData.isRugged || false, // Whether token is flagged as rugged
          };
        })
      );

      setScanResults(scanResults);
      setLastScanTime(Date.now());
    } catch (error) {
      console.error("Failed to load scanned tokens:", error);
      toast.error("Failed to load token scan results");
    } finally {
      setIsTokensLoading(false);
    }
  };

  // Toggle bot active status
  const toggleBotActive = async () => {
    if (!isInitialized || !isConnected) {
      toast.error("Services not initialized or wallet not connected");
      return;
    }

    try {
      if (isActive) {
        pauseBot();
      } else if (isPaused) {
        await startBot();
      } else {
        await startBot();
      }
    } catch (error) {
      console.error("Failed to toggle bot status:", error);
      toast.error("Failed to update bot status");
    }
  };

  // Submit scanner config changes
  const handleSubmitConfig = async () => {
    if (!isInitialized || !isConnected) {
      toast.error("Services not initialized or wallet not connected");
      return;
    }

    await updateScannerConfig(localScannerConfig);
  };

  // Handle token selection
  const handleTokenSelect = useCallback((token: TokenScanResult) => {
    setSelectedToken(token);
    setIsModalOpen(true);
  }, []);

  const handleBuyToken = useCallback(
    async (token: TokenScanResult, amount: number) => {
      if (!isConnected || !isInitialized) {
        toast.error("Please connect your wallet first");
        return;
      }

      try {
        // Execute buy through trading service
        const txId = await sniperTradingService.executeBuy(token.mint, amount);

        if (txId) {
          toast.success(`Buy order executed: ${txId.substring(0, 8)}...`, {
            position: "bottom-right",
            autoClose: 3000,
          });

          // Refresh positions list and transactions
          loadInitialData();
          await refreshPositionsData();
          await refreshTransactions();
        } else {
          throw new Error("Transaction failed");
        }
      } catch (error) {
        console.error("Buy transaction failed:", error);
        toast.error(
          `Transaction failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          {
            position: "bottom-right",
            autoClose: 5000,
          }
        );
        throw error; // Re-throw to handle in the modal
      }
    },
    [isConnected, isInitialized, refreshPositionsData, refreshTransactions]
  );

  // Add these handlers
  const handleSellClick = useCallback((position: Position) => {
    setSelectedPosition(position);
    setIsSellModalOpen(true);
  }, []);

  const handleSellToken = useCallback(
    async (position: Position, amount: number, percentage: number) => {
      if (!isConnected || !isInitialized) {
        toast.error("Please connect your wallet first");
        return;
      }

      try {
        const success = await sellPosition(position, amount, percentage);
        if (success) {
          setIsSellModalOpen(false);
          await refreshPositionsData();
          await refreshTransactions();
        }
      } catch (error) {
        console.error("Sell transaction failed:", error);
        toast.error(
          `Transaction failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          {
            position: "bottom-right",
            autoClose: 5000,
          }
        );
      }
    },
    [
      isConnected,
      isInitialized,
      sellPosition,
      refreshPositionsData,
      refreshTransactions,
    ]
  );

  // Memoize filtered tokens by risk level
  const { lowRiskTokens, highRiskTokens } = useMemo(() => {
    return {
      lowRiskTokens: scanResults.filter((token) => !token.isHighRisk),
      highRiskTokens: scanResults.filter((token) => token.isHighRisk),
    };
  }, [scanResults]);

  // Force refresh token data
  const refreshTokenData = () => {
    loadScannedTokens();
    toast.info("Refreshing token data...");
  };

  // Combined loading state
  const isPageLoading =
    isLoading || positionsLoading || positionsRefreshLoading;

  return (
    <motion.div
      className="p-4 space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Bot Control
        </h1>

        <div className="mt-4 md:mt-0 text-sm font-medium">
          Status:
          <span
            className={`ml-2 ${
              isActive
                ? "text-green-500"
                : isPaused
                ? "text-yellow-500"
                : "text-gray-500"
            }`}
          >
            {statusText}
          </span>
        </div>
      </div>

      {/* Bot Control Panel */}
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
          Bot Controls
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.button
            className={`flex items-center justify-center space-x-2 ${
              isActive
                ? "bg-red-500 hover:bg-red-600"
                : "bg-blue-500 hover:bg-blue-600"
            } text-white p-3 rounded-lg`}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.97 }}
            onClick={toggleBotActive}
            disabled={isPageLoading || isInitializing || !isConnected}
          >
            {isActive ? (
              <>
                <MdPause size={20} />
                <span>Pause Bot</span>
              </>
            ) : (
              <>
                <MdPlayArrow size={20} />
                <span>Start Bot</span>
              </>
            )}
          </motion.button>

          <motion.button
            className="flex items-center justify-center space-x-2 bg-green-500 hover:bg-green-600 text-white p-3 rounded-lg"
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.97 }}
            onClick={triggerManualScan}
            disabled={
              isPageLoading ||
              isInitializing ||
              !isConnected ||
              manualScanLoading
            }
          >
            <MdRefresh
              className={manualScanLoading ? "animate-spin" : ""}
              size={20}
            />
            <span>Manual Scan</span>
          </motion.button>

          <motion.button
            className="flex items-center justify-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white p-3 rounded-lg"
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => toast.info("Configuration opened")}
            disabled={isPageLoading || isInitializing || !isConnected}
          >
            <MdSettings size={20} />
            <span>Configure</span>
          </motion.button>
        </div>

        {/* Bot Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Active Time
            </h3>
            <p className="text-lg font-bold text-gray-800 dark:text-white">
              {isActive ? formattedActiveTime : "Inactive"}
            </p>
          </div>

          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Scans Completed
            </h3>
            <p className="text-lg font-bold text-gray-800 dark:text-white">
              {stats.scansCompleted}
            </p>
          </div>

          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Active Rules
            </h3>
            <p className="text-lg font-bold text-gray-800 dark:text-white">
              {stats.rulesActive}
            </p>
          </div>

          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Verified Tokens
            </h3>
            <p className="text-lg font-bold text-gray-800 dark:text-white">
              {scanResults.filter((token) => token.isVerified).length}
            </p>
          </div>

          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              High Risk
            </h3>
            <p className="text-lg font-bold text-gray-800 dark:text-white">
              {scanResults.filter((token) => token.isHighRisk).length}
            </p>
          </div>

          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Trades Executed
            </h3>
            <p className="text-lg font-bold text-gray-800 dark:text-white">
              {stats.triggeredBuys}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Scanner Configuration */}
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            Scanner Configuration
          </h2>

          <motion.button
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmitConfig}
            disabled={isPageLoading || isInitializing || !isConnected}
          >
            Update Configuration
          </motion.button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Minimum Liquidity (SOL)
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={localScannerConfig.minLiquiditySol}
              onChange={(e) =>
                setLocalScannerConfig((prev) => ({
                  ...prev,
                  minLiquiditySol: parseFloat(e.target.value),
                }))
              }
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Tokens with less liquidity than this will be ignored
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Maximum Rug Score
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={localScannerConfig.maxRugScore}
              onChange={(e) =>
                setLocalScannerConfig((prev) => ({
                  ...prev,
                  maxRugScore: parseInt(e.target.value),
                }))
              }
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Tokens with higher risk scores will be ignored (0-100)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Maximum Top Holder %
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={localScannerConfig.maxTopHolderPct || 80}
              onChange={(e) =>
                setLocalScannerConfig((prev) => ({
                  ...prev,
                  maxTopHolderPct: parseInt(e.target.value),
                }))
              }
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Tokens with higher top holder percentage will be ignored (0-100)
            </p>
          </div>

          <div className="flex items-center mt-2">
            <input
              type="checkbox"
              id="onlyVerified"
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              checked={localScannerConfig.onlyVerified || false}
              onChange={(e) =>
                setLocalScannerConfig((prev) => ({
                  ...prev,
                  onlyVerified: e.target.checked,
                }))
              }
            />
            <label
              htmlFor="onlyVerified"
              className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Only include verified tokens
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Scan Interval (seconds)
            </label>
            <input
              type="number"
              min="10"
              step="1"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={localScannerConfig.scanInterval / 1000}
              onChange={(e) =>
                setLocalScannerConfig((prev) => ({
                  ...prev,
                  scanInterval: parseInt(e.target.value) * 1000,
                }))
              }
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              How often to scan for new tokens (in seconds)
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoScan"
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              checked={localScannerConfig.autoScan}
              onChange={(e) =>
                setLocalScannerConfig((prev) => ({
                  ...prev,
                  autoScan: e.target.checked,
                }))
              }
            />
            <label
              htmlFor="autoScan"
              className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Auto-scan (scan automatically at the specified interval)
            </label>
          </div>
        </div>
      </motion.div>

      {/* Tabs for content */}
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          <button
            className={`py-3 px-4 font-medium text-sm focus:outline-none cursor-pointer ${
              activeTab === "positions"
                ? "text-blue-500 border-b-2 border-blue-500 dark:text-blue-400 dark:border-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
            }`}
            onClick={() => setActiveTab("positions")}
          >
            Positions
          </button>
          <button
            className={`py-3 px-4 font-medium text-sm focus:outline-none cursor-pointer ${
              activeTab === "transactions"
                ? "text-blue-500 border-b-2 border-blue-500 dark:text-blue-400 dark:border-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
            }`}
            onClick={() => setActiveTab("transactions")}
          >
            Recent Transactions
          </button>
          <button
            className={`py-3 px-4 font-medium text-sm focus:outline-none cursor-pointer ${
              activeTab === "low-risk"
                ? "text-blue-500 border-b-2 border-blue-500 dark:text-blue-400 dark:border-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
            }`}
            onClick={() => setActiveTab("low-risk")}
          >
            Low Risk Tokens
          </button>
          <button
            className={`py-3 px-4 font-medium text-sm focus:outline-none cursor-pointer ${
              activeTab === "high-risk"
                ? "text-blue-500 border-b-2 border-blue-500 dark:text-blue-400 dark:border-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
            }`}
            onClick={() => setActiveTab("high-risk")}
          >
            High Risk Tokens
          </button>
          <button
            className={`py-3 px-4 font-medium text-sm focus:outline-none cursor-pointer ${
              activeTab === "rules"
                ? "text-blue-500 border-b-2 border-blue-500 dark:text-blue-400 dark:border-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
            }`}
            onClick={() => setActiveTab("rules")}
          >
            Trading Rules
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Positions Tab */}
          {activeTab === "positions" && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                  Current Positions
                </h3>
                <button
                  className="text-blue-500 flex items-center text-sm"
                  onClick={() => refreshPositionsData()}
                >
                  <MdRefresh className="mr-1" /> Refresh
                </button>
              </div>

              <PositionsList
                positions={sortedPositions}
                isLoading={positionsLoading || positionsRefreshLoading}
                onPositionClick={(position) => {
                  toast.info(
                    `Clicked on position: ${position.symbol || position.mint}`
                  );
                }}
                onSellClick={handleSellClick}
              />
            </div>
          )}

          {/* UPDATED Transactions Tab */}
          {activeTab === "transactions" && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                  Recent Transactions
                </h3>
                <div className="flex items-center">
                  {transactionsLastUpdated > 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                      Updated {formatTimeAgo(transactionsLastUpdated)}
                    </span>
                  )}
                  <button
                    className="text-blue-500 flex items-center text-sm"
                    onClick={() => refreshTransactions()}
                    disabled={transactionsLoading}
                  >
                    <MdRefresh
                      className={`mr-1 ${
                        transactionsLoading ? "animate-spin" : ""
                      }`}
                      size={16}
                    />
                    Refresh
                  </button>
                </div>
              </div>

              {transactionsError && (
                <div className="bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 p-3 rounded-lg mb-4">
                  Error loading transactions: {transactionsError.message}
                  <button
                    className="ml-2 underline"
                    onClick={() => refreshTransactions()}
                  >
                    Retry
                  </button>
                </div>
              )}

              <TransactionsList
                transactions={transactions}
                isLoading={transactionsLoading}
                onTransactionClick={(transaction) => {
                  toast.info(
                    `Transaction details: ${
                      transaction.details || transaction.status
                    }`
                  );
                }}
              />
            </div>
          )}

          {/* Low Risk Tokens Tab */}
          {activeTab === "low-risk" && (
            <div>
              <TokenTable
                tokens={lowRiskTokens}
                title="Low Risk Tokens"
                isLoading={isTokensLoading}
                onTokenSelect={handleTokenSelect}
                onRefresh={refreshTokenData}
                isHighRisk={false}
              />

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                <span className="flex items-center">
                  <MdInfo className="mr-1" size={16} />
                  Low risk tokens have market cap above $1M, at least 3 social
                  media links, and locked liquidity.
                </span>
              </p>
            </div>
          )}

          {/* High Risk Tokens Tab */}
          {activeTab === "high-risk" && (
            <div>
              <TokenTable
                tokens={highRiskTokens}
                title="High Risk Tokens"
                isLoading={isTokensLoading}
                onTokenSelect={handleTokenSelect}
                onRefresh={refreshTokenData}
                isHighRisk={true}
              />

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 flex items-center">
                <MdWarning className="mr-1 text-yellow-500" size={16} />
                <span>
                  High risk tokens have market cap below $1M but still meet
                  minimum criteria: at least 3 social media links and locked
                  liquidity.
                </span>
              </p>
            </div>
          )}

          {/* Rules Tab */}
          {activeTab === "rules" && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                  Trading Rules
                </h3>
                <button
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm flex items-center"
                  onClick={() => toast.info("Add rule clicked")}
                >
                  <MdAdd className="mr-1" /> Add Rule
                </button>
              </div>

              {/* Rules are placeholders until we have the actual rule system */}
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-white mb-1">
                      New Token Rule
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Buy tokens with minimum 5 SOL liquidity and less than 70
                      rug score.
                    </p>
                    <div className="flex mt-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="mr-4">Amount: 0.1 SOL</span>
                      <span className="flex items-center">
                        <span className="w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                        Active
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="text-blue-500 p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900">
                      <MdSettings size={18} />
                    </button>
                    <button className="text-red-500 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900">
                      <MdDeleteOutline size={18} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-white mb-1">
                      Price Spike Rule
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Buy tokens when price spikes more than 20% in 5 minutes.
                    </p>
                    <div className="flex mt-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="mr-4">Amount: 0.05 SOL</span>
                      <span className="flex items-center">
                        <span className="w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                        Active
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="text-blue-500 p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900">
                      <MdSettings size={18} />
                    </button>
                    <button className="text-red-500 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900">
                      <MdDeleteOutline size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
      <TokenDetailModal
        token={selectedToken}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onBuy={handleBuyToken}
      />
      <SellModal
        position={selectedPosition}
        isOpen={isSellModalOpen}
        onClose={() => setIsSellModalOpen(false)}
        onSell={handleSellToken}
      />
    </motion.div>
  );
};

export default Bot;
