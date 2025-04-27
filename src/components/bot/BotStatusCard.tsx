import React from "react";
import { motion } from "motion/react";
import { MdMemory, MdPlayArrow, MdPause, MdSettings } from "react-icons/md";
import { Link } from "react-router-dom";
import useBot from "../../hooks/useBot";

interface BotStatusCardProps {
  compact?: boolean;
  className?: string;
}

const BotStatusCard: React.FC<BotStatusCardProps> = ({
  compact = false,
  className = "",
}) => {
  const {
    isActive,
    isPaused,
    statusText,
    formattedActiveTime,
    stats,
    startBot,
    pauseBot,
    isInitialized,
  } = useBot();

  const handleToggleBot = () => {
    if (isActive) {
      pauseBot();
    } else {
      startBot();
    }
  };

  // Compact version for use in smaller spaces
  if (compact) {
    return (
      <motion.div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 ${className}`}
        whileHover={{ y: -2, transition: { duration: 0.2 } }}
      >
        <div className="flex items-center justify-between">
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
            <p className="text-sm font-medium text-gray-800 dark:text-white">
              Bot: {statusText}
            </p>
          </div>

          <Link
            to="/bot"
            className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded-md"
          >
            Config
          </Link>
        </div>
      </motion.div>
    );
  }

  // Full version with more details
  return (
    <motion.div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 ${className}`}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
    >
      <div className="flex items-center justify-between mb-3">
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

        {isInitialized && (
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

      <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
        <div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Active time:
          </span>
          <p className="font-medium text-gray-800 dark:text-white">
            {isActive ? formattedActiveTime : "Not active"}
          </p>
        </div>

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
            Active rules:
          </span>
          <p className="font-medium text-gray-800 dark:text-white">
            {stats.rulesActive}
          </p>
        </div>

        <div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Success rate:
          </span>
          <p className="font-medium text-gray-800 dark:text-white">
            {stats.successRate}%
          </p>
        </div>
      </div>

      <Link
        to="/bot"
        className="mt-3 text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center justify-center"
      >
        <MdSettings size={14} className="mr-1" />
        Configure Bot
      </Link>
    </motion.div>
  );
};

export default BotStatusCard;
