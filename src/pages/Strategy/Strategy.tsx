import React from "react";
import { motion } from "motion/react";

const Strategy: React.FC = () => {
  return (
    <motion.div
      className="p-6 max-w-6xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">
        Strategy
      </h1>

      <motion.div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-card p-6"
        whileHover={{ y: -5, transition: { duration: 0.2 } }}
      >
        <p className="text-gray-700 dark:text-gray-300">
          Hello World! This is the Strategy page.
        </p>
      </motion.div>
    </motion.div>
  );
};

export default Strategy;
