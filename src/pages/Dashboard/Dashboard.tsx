import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MdArrowForward,
  MdMemory,
  MdAutoGraph,
  MdWallet,
  MdArrowUpward,
  MdArrowDownward,
  MdAttachMoney,
  MdRefresh,
  MdLogout,
  MdAccessTime,
  MdSettings,
  MdHistory,
  MdTrendingUp,
  MdShowChart,
  MdSpeed,
  MdNotifications,
  MdInfo,
  MdPlayArrow,
  MdPause,
} from "react-icons/md";
import { Link } from "react-router-dom";

// Import hooks
import useWallet from "../../hooks/useWalletService";
import useBot from "../../hooks/useBot";
import usePositions from "../../hooks/usePositions";

// Import services
import { serviceRegistry } from "../../services/ServiceRegistry";
import { sniperTradingService } from "../../services/domain/SniperTradingService";
import { CoinStatus, Position } from "../../types/types";

// Import components
import SellModal from "../../components/positions/SellModal";
import { toast } from "react-toastify";
import PositionsList from "../../components/positions";
import { useTransactionHistory } from "../../hooks/useTransactionHistory";

// Helper function to format time ago
function formatTimeAgo(timestamp: number): string {
  if (!timestamp) return "Never";

  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

const Dashboard: React.FC = () => {
  // Use wallet hook for wallet data
  const {
    isConnected,
    balance,
    solPrice,
    usdBalance,
    address,
    formatAddress,
    connectWallet,
    refreshWalletData,
    disconnectWallet,
    isLoading: walletLoading,
    lastUpdated: walletLastUpdated,
    manualRefreshLoading: walletRefreshLoading,
  } = useWallet();

  // Use bot hook for bot data
  const {
    isActive,
    isPaused,
    statusText,
    stats,
    startBot,
    pauseBot,
    isInitialized: isBotInitialized,
  } = useBot();

  // Use positions hook with renamed variables to avoid conflicts
  const {
    sortedPositions,
    isLoading: positionsLoading,
    statistics,
    refreshPositions: refreshPositionsData,
    manualRefreshLoading: positionsRefreshLoading,
    sellPosition,
  } = usePositions();

  const {
    transactions: recentTransactions,
    isLoading: transactionsLoading,
    error: transactionsError,
    lastUpdated: transactionsLastUpdated,
    refreshTransactions,
  } = useTransactionHistory({
    includePositions: true,
    limit: 5, // Show only 5 most recent transactions
    autoRefresh: true,
    refreshInterval: 30000, // 30 seconds
  });

  // Dashboard state
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(
    null
  );
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);

  // Initialize services
  useEffect(() => {
    const initializeServices = async () => {
      if (isInitializing || isInitialized) return;
      setIsInitializing(true);

      try {
        // Initialize service registry if not already done
        await serviceRegistry.initialize();
        setIsInitialized(true);

        // Initialize trading service if connected
        if (isConnected) {
          await sniperTradingService.initialize();
        }
      } catch (error) {
        console.error("Failed to initialize services:", error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeServices();
  }, [isConnected, isInitialized, isInitializing]);

  // Calculate average hold time for bot statistics
  const calculateAverageHoldTime = (positions: Position[]): number => {
    if (!positions.length) return 0;

    const now = Date.now();
    const holdTimes = positions.map((p) => (now - p.buyTime) / (1000 * 60));

    return Math.floor(
      holdTimes.reduce((sum, time) => sum + time, 0) / holdTimes.length
    );
  };

  // Bot statistics
  const botStats = useMemo(() => {
    return {
      activeBots: sniperTradingService.getWalletAddress() ? 1 : 0,
      successRate: statistics.successRate,
      totalTrades:
        sortedPositions.length +
        recentTransactions.filter(
          (t) => t.status === "success" || t.status === "bought"
        ).length,
      averageHoldTime: calculateAverageHoldTime(sortedPositions),
    };
  }, [sortedPositions, recentTransactions, statistics]);

  // Calculate profit/loss
  const profitLoss = useMemo(() => {
    return statistics.totalProfitLossSol;
  }, [statistics]);

  const isProfitable = profitLoss >= 0;

  // Calculate performance metrics
  const performance = useMemo(() => {
    return {
      dailyGain: 0, // Placeholder - would come from statistics in a real implementation
      weeklyGain: 0,
      monthlyGain: 0,
      totalGainUSD: statistics.totalProfitLossUsd,
      actualSolPrice: statistics.solPrice || solPrice, // Use price from statistics or wallet as fallback
    };
  }, [statistics, solPrice]);

  // Handler for bot toggle
  const handleToggleBot = useCallback(() => {
    if (isActive) {
      pauseBot();
    } else {
      startBot();
    }
  }, [isActive, pauseBot, startBot]);

  const handleSellClick = useCallback((position: Position) => {
    setSelectedPosition(position);
    setIsSellModalOpen(true);
  }, []);

  const handleSellToken = useCallback(
    async (position: Position, amount: number, percentage: number) => {
      if (!isConnected) {
        toast.error("Please connect your wallet first");
        return;
      }

      try {
        const success = await sellPosition(position, amount, percentage);
        if (success) {
          setIsSellModalOpen(false);
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
    [isConnected, sellPosition]
  );

  // Refresh both positions and wallet data
  const refreshAllData = useCallback(async () => {
    if (walletRefreshLoading || positionsRefreshLoading) return;

    await Promise.all([refreshWalletData(), refreshPositionsData()]);
  }, [
    walletRefreshLoading,
    positionsRefreshLoading,
    refreshWalletData,
    refreshPositionsData,
  ]);

  // Format transactions for display
  const formattedTransactions = useMemo(() => {
    const result = recentTransactions.map((tx) => {
      // Determine transaction type
      const type =
        tx.status === "buying" ||
        tx.status === "success" ||
        tx.status === "bought"
          ? "buy"
          : tx.status === "error"
          ? "error"
          : "pending";

      // Format for display
      return {
        id: tx.mint.substring(0, 8),
        type,
        token: tx.mint.substring(0, 6) + "...",
        amount: tx.details?.includes("Bought")
          ? tx.details.split(" ")[1] || "?"
          : "?",
        price: "?",
        time: Date.now() - Math.random() * 1000 * 60 * 60,
        status: tx.status,
        fullMint: tx.mint,
        details: tx.details || "",
      };
    });

    return result.slice(0, 5); // Show only most recent 5
  }, [recentTransactions]);

  // Combined loading state
  const isLoading =
    walletLoading ||
    positionsLoading ||
    walletRefreshLoading ||
    positionsRefreshLoading;

  return (
    <motion.div
      className="p-4 space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Dashboard
        </h1>

        <div className="mt-4 md:mt-0 text-sm font-medium">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
            <MdAccessTime className="mr-1" size={16} />
            Last updated:{" "}
            {walletLastUpdated ? formatTimeAgo(walletLastUpdated) : "Never"}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Balance Stat with loading state */}
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 flex items-center relative overflow-hidden"
          whileHover={{ y: -3, transition: { duration: 0.2 } }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
        >
          <div className="text-orange-500 p-3 rounded-lg mr-4">
            <MdWallet size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Balance</p>
            {isLoading ? (
              <div className="animate-pulse mt-1">
                <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mt-1"></div>
              </div>
            ) : (
              <>
                <p className="text-xl font-semibold text-gray-800 dark:text-white">
                  {isConnected ? `${balance.toFixed(4)} SOL` : "Not Connected"}
                </p>
                {isConnected && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    ≈ ${usdBalance.toFixed(2)}
                  </p>
                )}
              </>
            )}
          </div>
        </motion.div>

        {/* Profit/Loss Stat */}
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 flex items-center"
          whileHover={{ y: -3, transition: { duration: 0.2 } }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
        >
          <div
            className={`${
              isProfitable ? "text-green-500" : "text-red-500"
            } p-3 rounded-lg mr-4`}
          >
            <MdAutoGraph size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Daily P/L
            </p>
            {isLoading ? (
              <div className="animate-pulse mt-1">
                <div className="h-6 w-28 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ) : (
              <div className="flex items-center">
                <p
                  className={`text-xl font-semibold ${
                    isProfitable ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {isConnected
                    ? `${Math.abs(profitLoss).toFixed(4)} SOL`
                    : "0.00 SOL"}
                </p>
                {isConnected && profitLoss !== 0 && (
                  <span className="ml-1">
                    {isProfitable ? (
                      <MdArrowUpward className="text-green-500" />
                    ) : (
                      <MdArrowDownward className="text-red-500" />
                    )}
                  </span>
                )}
              </div>
            )}
            {isConnected && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ≈ ${Math.abs(statistics.totalProfitLossUsd).toFixed(2)}
                (@ ${performance.actualSolPrice.toFixed(2)})
              </p>
            )}
          </div>
        </motion.div>

        {/* Bot Status Card */}
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4"
          whileHover={{ y: -3, transition: { duration: 0.2 } }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.3 } }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <div className="text-blue-500 p-2 rounded-lg mr-3">
                <MdMemory size={22} />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Bot Status
                </p>
                <div className="flex items-center">
                  <div
                    className={`w-2 h-2 rounded-full mr-2 ${
                      isActive
                        ? "bg-green-500"
                        : isPaused
                        ? "bg-yellow-500"
                        : "bg-gray-500"
                    }`}
                  ></div>
                  <p className="text-lg font-semibold text-gray-800 dark:text-white">
                    {statusText}
                  </p>
                </div>
              </div>
            </div>

            {isBotInitialized && (
              <button
                onClick={handleToggleBot}
                className={`p-2 rounded-full ${
                  isActive
                    ? "bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                    : "bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                }`}
              >
                {isActive ? <MdPause size={18} /> : <MdPlayArrow size={18} />}
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1 mt-1 text-sm">
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Scans:
              </span>
              <p className="font-medium text-gray-800 dark:text-white">
                {stats.scansCompleted}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Success:
              </span>
              <p className="font-medium text-gray-800 dark:text-white">
                {stats.successRate}%
              </p>
            </div>
          </div>

          <Link
            to="/bot"
            className="mt-2 text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded flex items-center justify-center"
          >
            <MdSettings size={12} className="mr-1" />
            Configure
          </Link>
        </motion.div>

        {/* SOL Price Stat */}
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 flex items-center"
          whileHover={{ y: -3, transition: { duration: 0.2 } }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.4 } }}
        >
          <div className="text-blue-500 p-3 rounded-lg mr-4">
            <MdAttachMoney size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">SOL/USD</p>
            {isLoading ? (
              <div className="animate-pulse mt-1">
                <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ) : (
              <>
                <p className="text-xl font-semibold text-gray-800 dark:text-white">
                  ${solPrice.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  24h: {(performance.dailyGain * 100).toFixed(2)}%
                </p>
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* Wallet Status Card - Shown only when connected */}
      <AnimatePresence>
        {isConnected && (
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2 md:mb-0">
                Wallet Status
              </h2>

              <div className="flex space-x-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-medium flex items-center ${
                    isLoading ? "opacity-70" : ""
                  }`}
                  onClick={refreshAllData}
                  disabled={isLoading}
                >
                  <MdRefresh
                    className={`mr-1 ${isLoading ? "animate-spin" : ""}`}
                    size={16}
                  />
                  Refresh
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg text-sm font-medium flex items-center"
                  onClick={disconnectWallet}
                >
                  <MdLogout className="mr-1" size={16} />
                  Disconnect
                </motion.button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Address:
                </p>
                {isLoading ? (
                  <div className="animate-pulse mt-1">
                    <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
                  </div>
                ) : (
                  <p className="font-mono text-sm text-gray-700 dark:text-gray-300 break-all">
                    {formatAddress(address, 24)}
                  </p>
                )}
              </div>

              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Bot Status:
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isActive
                          ? "bg-green-500"
                          : isPaused
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      } mr-2`}
                    ></div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {statusText}
                    </p>
                  </div>
                  <Link
                    to="/bot"
                    className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded flex items-center"
                  >
                    <MdSettings size={12} className="mr-1" />
                    Configure
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Tabs - Only appears when connected */}
      <AnimatePresence>
        {isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden"
          >
            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                className={`py-3 px-4 font-medium text-sm focus:outline-none flex items-center ${
                  activeTab === "overview"
                    ? "text-blue-500 border-b-2 border-blue-500 dark:text-blue-400 dark:border-blue-400"
                    : "text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
                }`}
                onClick={() => setActiveTab("overview")}
              >
                <MdShowChart className="mr-1" size={16} />
                Overview
              </button>
              <button
                className={`py-3 px-4 font-medium text-sm focus:outline-none flex items-center ${
                  activeTab === "activity"
                    ? "text-blue-500 border-b-2 border-blue-500 dark:text-blue-400 dark:border-blue-400"
                    : "text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
                }`}
                onClick={() => setActiveTab("activity")}
              >
                <MdHistory className="mr-1" size={16} />
                Recent Activity
              </button>
              <button
                className={`py-3 px-4 font-medium text-sm focus:outline-none flex items-center ${
                  activeTab === "performance"
                    ? "text-blue-500 border-b-2 border-blue-500 dark:text-blue-400 dark:border-blue-400"
                    : "text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
                }`}
                onClick={() => setActiveTab("performance")}
              >
                <MdTrendingUp className="mr-1" size={16} />
                Performance
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                    Bot Overview
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Bot Statistics */}
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <MdSpeed className="text-blue-500 mr-2" size={18} />
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Success Rate
                        </h4>
                      </div>
                      <p className="text-2xl font-bold text-gray-800 dark:text-white">
                        {botStats.successRate}%
                      </p>
                    </div>

                    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <MdAutoGraph
                          className="text-green-500 mr-2"
                          size={18}
                        />
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Total Trades
                        </h4>
                      </div>
                      <p className="text-2xl font-bold text-gray-800 dark:text-white">
                        {botStats.totalTrades}
                      </p>
                    </div>

                    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <MdAccessTime
                          className="text-orange-500 mr-2"
                          size={18}
                        />
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Avg Hold Time
                        </h4>
                      </div>
                      <p className="text-2xl font-bold text-gray-800 dark:text-white">
                        {botStats.averageHoldTime}m
                      </p>
                    </div>

                    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <MdAttachMoney
                          className="text-purple-500 mr-2"
                          size={18}
                        />
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Profit/Loss
                        </h4>
                      </div>
                      <p
                        className={`text-2xl font-bold ${
                          performance.totalGainUSD >= 0
                            ? "text-green-500"
                            : "text-red-500"
                        }`}
                      >
                        {performance.totalGainUSD > 0 ? "+" : ""}
                        {performance.totalGainUSD.toFixed(2)} USD
                      </p>
                    </div>
                  </div>

                  {/* Position Overview */}
                  <div className="mt-6">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-3">
                      Active Positions
                    </h3>

                    {sortedPositions.length > 0 ? (
                      <PositionsList
                        positions={sortedPositions}
                        isLoading={positionsLoading || positionsRefreshLoading}
                        onPositionClick={(position) => {
                          toast.info(
                            `Clicked on position: ${
                              position.symbol || position.mint
                            }`
                          );
                        }}
                        onSellClick={handleSellClick}
                      />
                    ) : (
                      <div className="text-center py-10 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <MdInfo
                          size={40}
                          className="mx-auto mb-3 text-gray-400 dark:text-gray-500 opacity-50"
                        />
                        <p className="text-gray-600 dark:text-gray-400">
                          No active positions found.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex flex-wrap gap-3 mt-4">
                    <Link
                      to="/bot"
                      className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium flex items-center"
                    >
                      <MdSettings className="mr-2" size={16} />
                      Configure Bot
                    </Link>
                    <Link
                      to="/strategy"
                      className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg text-sm font-medium flex items-center"
                    >
                      <MdAutoGraph className="mr-2" size={16} />
                      Create Strategy
                    </Link>
                    <button className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white py-2 px-4 rounded-lg text-sm font-medium flex items-center">
                      <MdNotifications className="mr-2" size={16} />
                      Set Alerts
                    </button>
                  </div>
                </div>
              )}

              {/* Activity Tab */}
              {activeTab === "activity" && (
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

                  {recentTransactions.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Token
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Details
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Time
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {recentTransactions.map((tx) => {
                            // Determine transaction type
                            const type =
                              tx.status === "buying" ||
                              tx.status === "success" ||
                              tx.status === "bought"
                                ? "buy"
                                : tx.status === "error"
                                ? "error"
                                : tx.status === "selling"
                                ? "sell"
                                : "pending";

                            const txKey = `${tx.mint}_${tx.status}_${
                              tx.timestamp || Date.now()
                            }`;

                            const actualTimestamp = tx.timestamp || Date.now();

                            return (
                              <tr
                                key={txKey}
                                className="hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer"
                                onClick={() => {
                                  // Display transaction info using toast
                                  toast.info(
                                    `Transaction details: ${
                                      tx.details || tx.status
                                    }`
                                  );
                                }}
                              >
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span
                                    className={`px-2 py-1 text-xs rounded-full ${
                                      type === "buy"
                                        ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200"
                                        : type === "sell"
                                        ? "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200"
                                        : type === "error"
                                        ? "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200"
                                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200"
                                    }`}
                                  >
                                    {type.toUpperCase()}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                                  {tx.mint.substring(0, 6) + "..."}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                                  {tx.details || "No details available"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span
                                    className={`px-2 py-1 text-xs rounded-full ${
                                      tx.status === "success" ||
                                      tx.status === "bought" ||
                                      tx.status === "profit"
                                        ? "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200"
                                        : tx.status === "error" ||
                                          tx.status === "loss"
                                        ? "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200"
                                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200"
                                    }`}
                                  >
                                    {tx.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                  {formatTimeAgo(actualTimestamp)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : transactionsLoading ? (
                    <div className="animate-pulse space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="bg-gray-200 dark:bg-gray-700 rounded-lg h-16"
                        ></div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                      <MdInfo size={40} className="mx-auto mb-3 opacity-50" />
                      <p>No recent transactions found.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Performance Tab */}
              {activeTab === "performance" && (
                <div>
                  <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
                    Performance Metrics
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Daily Performance
                      </h4>
                      <div className="flex items-center">
                        <p
                          className={`text-2xl font-bold ${
                            performance.dailyGain >= 0
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                        >
                          {performance.dailyGain >= 0 ? "+" : ""}
                          {(performance.dailyGain * 100).toFixed(2)}%
                        </p>
                        {performance.dailyGain >= 0 ? (
                          <MdArrowUpward
                            className="ml-1 text-green-500"
                            size={20}
                          />
                        ) : (
                          <MdArrowDownward
                            className="ml-1 text-red-500"
                            size={20}
                          />
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Weekly Performance
                      </h4>
                      <div className="flex items-center">
                        <p
                          className={`text-2xl font-bold ${
                            performance.weeklyGain >= 0
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                        >
                          {performance.weeklyGain >= 0 ? "+" : ""}
                          {(performance.weeklyGain * 100).toFixed(2)}%
                        </p>
                        {performance.weeklyGain >= 0 ? (
                          <MdArrowUpward
                            className="ml-1 text-green-500"
                            size={20}
                          />
                        ) : (
                          <MdArrowDownward
                            className="ml-1 text-red-500"
                            size={20}
                          />
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Monthly Performance
                      </h4>
                      <div className="flex items-center">
                        <p
                          className={`text-2xl font-bold ${
                            performance.monthlyGain >= 0
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                        >
                          {performance.monthlyGain >= 0 ? "+" : ""}
                          {(performance.monthlyGain * 100).toFixed(2)}%
                        </p>
                        {performance.monthlyGain >= 0 ? (
                          <MdArrowUpward
                            className="ml-1 text-green-500"
                            size={20}
                          />
                        ) : (
                          <MdArrowDownward
                            className="ml-1 text-red-500"
                            size={20}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Placeholder for performance chart */}
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center">
                    <p className="text-gray-500 dark:text-gray-400 mb-2">
                      Performance Chart
                    </p>
                    <div className="h-40 flex items-center justify-center">
                      <p className="text-gray-500 dark:text-gray-400">
                        This is a placeholder for a performance chart. We could
                        integrate a recharts or D3 chart here showing the
                        portfolio performance over time.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Get Started Section */}
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
          Get Started
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Configure Bot Card - Always show */}
          <motion.div
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col h-full"
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
          >
            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
              Configure Bot
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm flex-1">
              Set up your trading parameters and strategies
            </p>
            <Link
              to="/bot"
              className="mt-4 inline-flex items-center text-blue-500 dark:text-blue-400 text-sm font-medium"
            >
              Get started <MdArrowForward className="ml-1" />
            </Link>
          </motion.div>

          {/* Create Strategy Card - Always show */}
          <motion.div
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col h-full"
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
          >
            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
              Create Strategy
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm flex-1">
              Build custom strategies for different market conditions
            </p>
            <Link
              to="/strategy"
              className="mt-4 inline-flex items-center text-blue-500 dark:text-blue-400 text-sm font-medium"
            >
              Get started <MdArrowForward className="ml-1" />
            </Link>
          </motion.div>

          {/* Connect Wallet Card - Only show if not connected */}
          <AnimatePresence mode="wait">
            {!isConnected ? (
              <motion.div
                key="connect-card"
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col h-full"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
                  Connect Wallet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm flex-1">
                  Connect your wallet to start trading
                </p>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="mt-4 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium flex items-center w-full justify-center"
                  onClick={() => connectWallet()}
                  disabled={walletLoading}
                >
                  {walletLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  ) : (
                    <MdWallet className="mr-2" size={16} />
                  )}
                  {walletLoading ? "Connecting..." : "Connect Wallet"}
                </motion.button>
              </motion.div>
            ) : (
              /* Manage Trades Card - Show when wallet is connected instead of Connect Wallet */
              <motion.div
                key="manage-card"
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col h-full"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
                  Manage Trades
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm flex-1">
                  Monitor and manage your active trading positions
                </p>
                <Link
                  to="/bot"
                  className="mt-4 inline-flex items-center text-blue-500 dark:text-blue-400 text-sm font-medium"
                >
                  View Trades <MdArrowForward className="ml-1" />
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      <SellModal
        position={selectedPosition}
        isOpen={isSellModalOpen}
        onClose={() => setIsSellModalOpen(false)}
        onSell={handleSellToken}
      />
    </motion.div>
  );
};

export default Dashboard;
