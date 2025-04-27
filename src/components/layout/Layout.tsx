import React, { useState, useEffect, useCallback, memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MdMenu, MdClose } from "react-icons/md";
import { debounce } from "lodash";
import Sidebar from "./Sidebar";
import ErrorBoundary from "../common/ErrorBoundary";
import { useNetworkHealth } from "../../hooks/monitoring";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  // const { isDarkMode, toggleTheme } = useTheme();
  const { networkHealth } = useNetworkHealth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  // Debounced resize handler for performance
  const handleResize = useCallback(
    debounce(() => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      // Only change these states when the mobile status changes
      if (mobile !== isMobile) {
        setIsCollapsed(mobile);
        setIsSidebarVisible(!mobile);
      }
    }, 100),
    [isMobile]
  );

  // Check if screen is mobile on mount and when window resizes
  useEffect(() => {
    // Initial check
    handleResize();

    // Listen for window resize
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      handleResize.cancel();
      window.removeEventListener("resize", handleResize);
    };
  }, [handleResize]);

  // Save sidebar state preferences in localStorage
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem("sidebarCollapsed", JSON.stringify(isCollapsed));
    }
  }, [isCollapsed, isMobile]);

  // Load sidebar state from localStorage on mount
  useEffect(() => {
    if (!isMobile) {
      const savedCollapsed = localStorage.getItem("sidebarCollapsed");
      if (savedCollapsed !== null) {
        setIsCollapsed(JSON.parse(savedCollapsed));
      }
    }
  }, [isMobile]);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarVisible((prev) => !prev);
  }, []);

  return (
    <div className={`flex h-screen overflow-hidden }`}>
      {/* Network status banner - show when disconnected */}
      {/* {networkHealth && networkHealth.status === "disconnected" && (
        <div className="fixed top-0 left-0 right-0 bg-red-700 text-white py-1 px-4 text-center text-sm z-50">
          Network connection issue. Check your connection or try again later.
        </div>
      )} */}

      {/* Mobile menu button with improved accessibility */}
      {isMobile && (
        <motion.div
          className="fixed top-4 right-4 z-40"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-full bg-gray-800 text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            aria-label={isSidebarVisible ? "Close menu" : "Open menu"}
            aria-expanded={isSidebarVisible}
          >
            {isSidebarVisible ? <MdClose size={24} /> : <MdMenu size={24} />}
          </button>
        </motion.div>
      )}

      {/* Sidebar with ErrorBoundary */}
      <ErrorBoundary
        fallback={
          <div className="bg-gray-900 text-red-400 p-4 w-16 h-screen">
            <div className="text-center">
              <span className="text-3xl">!</span>
              <p className="text-xs mt-2">Sidebar Error</p>
            </div>
          </div>
        }
      >
        <AnimatePresence>
          {(isSidebarVisible || !isMobile) && (
            <motion.div
              initial={isMobile ? { x: -64 } : false}
              animate={{ x: 0 }}
              exit={isMobile ? { x: -64 } : undefined}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className={`${isMobile ? "fixed z-30" : "relative"}`}
            >
              <Sidebar
                isCollapsed={isCollapsed}
                toggleCollapsed={toggleCollapsed}
                isDarkMode={false}
                toggleTheme={() => {}}
                isMobile={isMobile}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </ErrorBoundary>

      {/* Overlay for mobile sidebar with accessibility improvements */}
      <AnimatePresence>
        {isMobile && isSidebarVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black z-20"
            onClick={toggleSidebar}
            role="button"
            tabIndex={-1}
            aria-label="Close sidebar"
          />
        )}
      </AnimatePresence>

      {/* Main content area with ErrorBoundary */}
      <ErrorBoundary>
        <motion.main
          className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-900 transition-all duration-300"
          initial={false}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <div className="max-w-7xl mx-auto p-4">{children}</div>
        </motion.main>
      </ErrorBoundary>

      {/* WalletInfo with ErrorBoundary */}
      <ErrorBoundary
        fallback={
          <div className="fixed z-40 top-4 left-16 bg-red-700 text-white p-2 rounded-lg text-sm">
            Wallet connection issue
          </div>
        }
      >
        <motion.div
          className={`fixed z-40 transition-all duration-300 ${
            isMobile && isSidebarVisible && isCollapsed
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
          initial={{ opacity: 0, y: 20, x: 65 }}
          animate={{
            opacity: isMobile && isSidebarVisible && isCollapsed ? 1 : 0,
            y: 0,
            x: 65,
          }}
          transition={{ duration: 0.3, ease: "easeInOut", delay: 0.1 }}
          style={{
            top: "4rem",
            left: 0,
            width: "calc(100% - 65px)",
            maxWidth: "500px",
            padding: "0 1rem",
          }}
        >
          {/* <WalletInfo /> */}
        </motion.div>
      </ErrorBoundary>

      {/* Keyboard accessibility helper - allows ESC key to close mobile sidebar */}
      <div
        aria-hidden="true"
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === "Escape" && isMobile && isSidebarVisible) {
            toggleSidebar();
          }
        }}
      />
    </div>
  );
};

export default memo(Layout);
