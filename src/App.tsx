import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import ErrorBoundary from "./components/common/ErrorBoundary";
import Dashboard from "./pages/Dashboard/Dashboard";
import Bot from "./pages/Bot/Bot";
import Strategy from "./pages/Strategy/Strategy";

const App: React.FC = () => {
  return (
    // <AppProviders>
    <ErrorBoundary>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/bot" element={<Bot />} />
            <Route path="/strategy" element={<Strategy />} />
          </Routes>
        </Layout>
      </Router>
    </ErrorBoundary>
    // </AppProviders>
  );
};

export default App;
