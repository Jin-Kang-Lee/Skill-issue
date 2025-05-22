import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Import the Navbar
import Navbar from './components/Navbar';

//Import pages
import HomePage from './pages/HomePage';
import ResultsPage from './pages/ResultsPage';

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Render the navbar on every page */}
      <Navbar />

      {/* Main content area */}
      <div className="flex-1">
        <Routes>
          {/* Home route */}
          <Route path="/" element={<HomePage />} />

          {/* Results route */}
          <Route path="/results" element={<ResultsPage />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
