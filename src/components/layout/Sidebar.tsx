import React, { memo, useMemo, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  MdDashboard,
  MdAutoGraph,
  MdSmartToy,
  MdLightMode,
  MdDarkMode,
  MdChevronLeft,
  MdChevronRight,
} from "react-icons/md";
import { useWalletContext } from "../../contexts/wallet";

// Props for the Sidebar component
interface SidebarProps {
  isCollapsed: boolean;
  toggleCollapsed: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  isMobile: boolean;
}

// Menu item interface
interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: string;
  requiresWallet?: boolean;
}

// NavItem sub-component for better composition
const NavItem = memo(
  ({
    item,
    isActive,
    isCollapsed,
    onClick,
  }: {
    item: MenuItem;
    isActive: boolean;
    isCollapsed: boolean;
    onClick?: () => void;
  }) => (
    <Link
      to={item.path}
      className={`flex items-center px-3 py-2 rounded-md group transition-colors ${
        isActive
          ? "bg-blue-900 bg-opacity-30 text-blue-400"
          : "hover:bg-gray-800 text-gray-300"
      }`}
      onClick={onClick}
    >
      <div className="text-lg" aria-hidden="true">
        {item.icon}
      </div>
      {!isCollapsed && (
        <div className="ml-3 flex-1 flex justify-between items-center">
          <span className="font-medium">{item.label}</span>
          {item.badge && (
            <span className="bg-purple-700 text-white text-xs px-2 py-0.5 rounded">
              {item.badge}
            </span>
          )}
        </div>
      )}
    </Link>
  )
);

const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  toggleCollapsed,
  isDarkMode,
  toggleTheme,
  isMobile,
}) => {
  const location = useLocation();
  const { connected } = useWalletContext();

  // Memoize menu items to prevent recreation on re-renders
  const menuItems = useMemo<MenuItem[]>(
    () => [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: <MdDashboard size={22} />,
        path: "/",
      },
      {
        id: "bot",
        label: "Bot",
        icon: <MdSmartToy size={22} />,
        path: "/bot",
      },
      {
        id: "strategy",
        label: "Strategy",
        icon: <MdAutoGraph size={22} />,
        path: "/strategy",
      },
    ],
    []
  );

  const secondaryMenuItems = useMemo<MenuItem[]>(() => [], []);

  // Determine if a menu item is active
  const isActive = useCallback(
    (path: string) => {
      if (path === "/" && location.pathname === "/") return true;
      if (path !== "/" && location.pathname.startsWith(path)) return true;
      return false;
    },
    [location.pathname]
  );

  // Filter out items that require wallet if not connected
  const filteredMenuItems = useMemo(
    () => menuItems.filter((item) => !item.requiresWallet || connected),
    [menuItems, connected]
  );

  const filteredSecondaryItems = useMemo(
    () =>
      secondaryMenuItems.filter((item) => !item.requiresWallet || connected),
    [secondaryMenuItems, connected]
  );

  return (
    <motion.div
      className={`flex flex-col h-screen bg-gray-900 text-gray-300 transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
      initial={false}
      animate={{ width: isCollapsed ? 64 : 256 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      role="navigation"
      aria-label="Main Navigation"
    >
      {/* Logo and collapse button section */}
      <div className="flex items-center justify-between p-4">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              className="flex items-center space-x-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <span className="text-lg font-bold text-white">Bot Of Budju</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle button with improved accessibility */}
        <button
          onClick={toggleCollapsed}
          className="text-gray-400 hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 rounded"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <MdChevronRight size={22} />
          ) : (
            <MdChevronLeft size={22} />
          )}
        </button>
      </div>

      {/* Main menu with optimized rendering */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {filteredMenuItems.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            isActive={isActive(item.path)}
            isCollapsed={isCollapsed}
          />
        ))}
      </nav>

      {/* Secondary menu (bottom section) */}
      <div className="p-2 border-t border-gray-800 space-y-1">
        {filteredSecondaryItems.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            isActive={isActive(item.path)}
            isCollapsed={isCollapsed}
          />
        ))}

        {/* Theme toggle button with improved accessibility */}
        <button
          onClick={toggleTheme}
          className={`w-full flex items-center px-3 py-2 rounded-md hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500`}
          aria-label={
            isDarkMode ? "Switch to light mode" : "Switch to dark mode"
          }
          title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          <div className="text-lg" aria-hidden="true">
            {isDarkMode ? <MdLightMode size={22} /> : <MdDarkMode size={22} />}
          </div>
          {!isCollapsed && (
            <span className="ml-3 font-medium">
              {isDarkMode ? "Light Mode" : "Dark Mode"}
            </span>
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default memo(Sidebar);
