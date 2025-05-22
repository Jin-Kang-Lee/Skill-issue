import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

import { SuggestionsProvider } from './context/SuggestionsContext';
import { BrowserRouter as Router } from 'react-router-dom';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <SuggestionsProvider>
      <Router>
        <App />
      </Router>
    </SuggestionsProvider>
  </React.StrictMode>
);

// If you want to measure performance in your app:
reportWebVitals();
