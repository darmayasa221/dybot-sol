import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MdAccountBalanceWallet,
  MdClose,
  MdExpandMore,
  MdContentCopy,
  MdLogout,
} from "react-icons/md";
import { useWalletConnection, useWalletBalances } from "../../hooks/wallet";
import { useNetworkHealth } from "../../hooks/monitoring";

export interface ConnectWalletProps {
  className?: string;
  variant?: "full" | "compact" | "button";
  onConnect?: () => void;
  onDisconnect?: () => void;
}

const ConnectWallet: React.FC<ConnectWalletProps> = ({
  className = "",
  variant = "full",
  onConnect,
  onDisconnect,
}) => {
  // Hooks for wallet functionality
  const {
    connected,
    walletInfo,
    connect,
    disconnect,
    connecting,
    error: connectionError,
  } = useWalletConnection();

  const {
    solBalance,
    solValueUsd,
    loading: balancesLoading,
  } = useWalletBalances();

  const { networkHealth } = useNetworkHealth();

  // Local state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Wallet options
  const walletOptions = useMemo(
    () => [
      {
        id: "phantom",
        name: "Phantom",
        icon: "https://187760183-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-MVOiF6Zqit57q_hxJYp%2Fuploads%2FHEjleywo9QOnfYebBPCZ%2FPhantom_SVG_Icon.svg?alt=media&token=71b80a0a-def7-4f98-ae70-5e0843fdaaec",
      },
      {
        id: "solflare",
        name: "Solflare",
        icon: "https://solflare.com/favicon.ico",
      },
    ],
    []
  );

  // Handle opening wallet modal
  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  // Handle closing wallet modal
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedWallet(null);
  }, []);

  // Handle wallet selection
  const handleSelectWallet = useCallback((walletId: string) => {
    setSelectedWallet(walletId);
  }, []);

  // Handle wallet connection
  const handleConnect = useCallback(async () => {
    if (!selectedWallet) return;

    try {
      await connect(selectedWallet);
      setIsModalOpen(false);
      onConnect?.();
    } catch (err) {
      console.error("Failed to connect wallet:", err);
    }
  }, [selectedWallet, connect, onConnect]);

  // Handle wallet disconnection
  const handleDisconnect = useCallback(async () => {
    try {
      await disconnect();
      setIsDropdownOpen(false);
      onDisconnect?.();
    } catch (err) {
      console.error("Failed to disconnect wallet:", err);
    }
  }, [disconnect, onDisconnect]);

  // Handle copy address to clipboard
  const handleCopyAddress = useCallback(() => {
    if (!walletInfo.publicKey) return;

    navigator.clipboard.writeText(walletInfo.publicKey);
    setCopySuccess(true);

    setTimeout(() => {
      setCopySuccess(false);
    }, 2000);
  }, [walletInfo.publicKey]);

  // Format address for display
  const formattedAddress = useMemo(() => {
    if (!walletInfo.publicKey) return "";
    return `${walletInfo.publicKey.slice(0, 4)}...${walletInfo.publicKey.slice(
      -4
    )}`;
  }, [walletInfo.publicKey]);

  // Determine network status color
  const networkStatusColor = useMemo(() => {
    if (!networkHealth) return "gray";

    switch (networkHealth.status) {
      case "healthy":
        return "green";
      case "degraded":
        return "yellow";
      case "congested":
        return "orange";
      default:
        return "red";
    }
  }, [networkHealth]);

  // Render connect button only
  if (variant === "button") {
    return (
      <motion.button
        className={`bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center ${className}`}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
        onClick={
          connected ? () => setIsDropdownOpen(!isDropdownOpen) : handleOpenModal
        }
        disabled={connecting}
      >
        <MdAccountBalanceWallet className="mr-2" size={20} />
        {connected ? "Connected" : "Connect Wallet"}
      </motion.button>
    );
  }

  // Render compact version
  if (variant === "compact") {
    return (
      <div className={`relative ${className}`}>
        <motion.button
          className={`bg-gray-800 border border-gray-700 hover:border-blue-500 text-white rounded-lg p-2 flex items-center ${
            connected ? "pr-3" : ""
          }`}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          onClick={
            connected
              ? () => setIsDropdownOpen(!isDropdownOpen)
              : handleOpenModal
          }
          disabled={connecting}
        >
          <MdAccountBalanceWallet size={20} className="mr-1" />
          {connected && (
            <span className="ml-1 font-medium text-sm">{formattedAddress}</span>
          )}
        </motion.button>

        {/* Dropdown Menu */}
        {connected && (
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-3 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Balance</span>
                    <div
                      className="w-3 h-3 rounded-full bg-green-500"
                      title="Connected"
                    ></div>
                  </div>
                  <div className="mt-1 font-medium">
                    {solBalance.toFixed(4)} SOL
                  </div>
                  <div className="text-sm text-gray-400">
                    ${solValueUsd.toFixed(2)}
                  </div>
                </div>
                <div className="p-2">
                  <button
                    className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md flex items-center"
                    onClick={handleCopyAddress}
                  >
                    <MdContentCopy className="mr-2" size={16} />
                    {copySuccess ? "Copied!" : "Copy Address"}
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-700 rounded-md flex items-center"
                    onClick={handleDisconnect}
                  >
                    <MdLogout className="mr-2" size={16} />
                    Disconnect
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Connect Modal */}
        <ConnectWalletModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          walletOptions={walletOptions}
          selectedWallet={selectedWallet}
          onSelectWallet={handleSelectWallet}
          onConnect={handleConnect}
          isConnecting={connecting}
          error={connectionError}
        />
      </div>
    );
  }

  // Render full version (default)
  return (
    <div className={`relative ${className}`}>
      {!connected ? (
        <motion.button
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleOpenModal}
          disabled={connecting}
        >
          <MdAccountBalanceWallet className="mr-2" size={20} />
          Connect Wallet
        </motion.button>
      ) : (
        <motion.div
          className="relative bg-gray-800 border border-gray-700 rounded-lg p-3"
          whileHover={{ boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-gray-700 p-2 rounded-md mr-3">
                <MdAccountBalanceWallet size={24} className="text-blue-400" />
              </div>
              <div>
                <div className="flex items-center">
                  <span className="font-medium text-white">
                    {formattedAddress}
                  </span>
                  <button
                    className="ml-2 text-gray-400 hover:text-white"
                    onClick={handleCopyAddress}
                    title="Copy address"
                  >
                    <MdContentCopy size={16} />
                  </button>
                </div>
                <div className="text-sm text-gray-400">
                  via {walletInfo.providerName || "Wallet"}
                  <span className="ml-2 inline-block w-2 h-2 rounded-full bg-green-500"></span>
                </div>
              </div>
            </div>

            <button
              className="text-gray-400 hover:text-white"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <MdExpandMore size={24} />
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between pt-3 border-t border-gray-700">
            <div>
              <div className="text-sm text-gray-400">Balance</div>
              <div className="font-medium text-white">
                {solBalance.toFixed(4)} SOL
              </div>
              <div className="text-sm text-gray-400">
                ${solValueUsd.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Network</div>
              <div className="flex items-center">
                <span
                  className={`w-2 h-2 rounded-full bg-${networkStatusColor}-500 mr-2`}
                ></span>
                <span className="font-medium text-white capitalize">
                  {networkHealth?.status || "Unknown"}
                </span>
              </div>
            </div>
          </div>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                className="absolute left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-2">
                  <button
                    className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-700 rounded-md flex items-center"
                    onClick={handleDisconnect}
                  >
                    <MdLogout className="mr-2" size={16} />
                    Disconnect Wallet
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Connect Modal */}
      <ConnectWalletModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        walletOptions={walletOptions}
        selectedWallet={selectedWallet}
        onSelectWallet={handleSelectWallet}
        onConnect={handleConnect}
        isConnecting={connecting}
        error={connectionError}
      />
    </div>
  );
};

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletOptions: Array<{ id: string; name: string; icon: string }>;
  selectedWallet: string | null;
  onSelectWallet: (walletId: string) => void;
  onConnect: () => void;
  isConnecting: boolean;
  error: Error | null;
}

const ConnectWalletModal: React.FC<ConnectWalletModalProps> = ({
  isOpen,
  onClose,
  walletOptions,
  selectedWallet,
  onSelectWallet,
  onConnect,
  isConnecting,
  error,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 20 }}
          >
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h2 className="text-xl font-semibold text-white">
                  Connect Wallet
                </h2>
                <button
                  className="text-gray-400 hover:text-white"
                  onClick={onClose}
                >
                  <MdClose size={24} />
                </button>
              </div>

              <div className="p-4">
                <p className="text-gray-300 mb-4">
                  Connect your wallet to access all features of the application.
                </p>

                <div className="space-y-2">
                  {walletOptions.map((wallet) => (
                    <motion.button
                      key={wallet.id}
                      className={`w-full flex items-center p-3 rounded-lg border transition-colors ${
                        selectedWallet === wallet.id
                          ? "border-blue-500 bg-gray-700"
                          : "border-gray-700 hover:border-gray-500"
                      }`}
                      onClick={() => onSelectWallet(wallet.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <img
                        src={wallet.icon}
                        alt={wallet.name}
                        className="w-8 h-8 mr-3"
                        onError={(e) => {
                          // Fallback if image doesn't load
                          (e.target as HTMLImageElement).src =
                            "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjIiIHk9IjQiIHdpZHRoPSIyMCIgaGVpZ2h0PSIxNiIgcng9IjIiPjwvcmVjdD48cGF0aCBkPSJNMiAxMGg2Ij48L3BhdGg+PHBhdGggZD0iTTIgMTRoNCIvPjxjaXJjbGUgY3g9IjE2IiBjeT0iMTIiIHI9IjIiPjwvY2lyY2xlPjwvc3ZnPg==";
                        }}
                      />
                      <span className="text-white font-medium">
                        {wallet.name}
                      </span>
                    </motion.button>
                  ))}
                </div>

                {error && (
                  <div className="mt-4 p-3 bg-red-900 bg-opacity-30 border border-red-700 rounded-lg text-red-400 text-sm">
                    {error.message}
                  </div>
                )}

                <div className="mt-6 flex justify-end space-x-3">
                  <motion.button
                    className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg"
                    whileHover={{
                      scale: 1.03,
                      backgroundColor: "rgba(75, 85, 99, 0.3)",
                    }}
                    whileTap={{ scale: 0.97 }}
                    onClick={onClose}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center disabled:opacity-50 disabled:hover:bg-blue-600"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={onConnect}
                    disabled={!selectedWallet || isConnecting}
                  >
                    {isConnecting ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Connecting...
                      </>
                    ) : (
                      "Connect"
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ConnectWallet;
