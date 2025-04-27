import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

const App: React.FC = () => {
  return (
    <>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/bot" element={<Bot />} />
            <Route path="/strategy" element={<Strategy />} />
          </Routes>
        </Layout>
      </Router>
    </>
  );
};

export default App;
