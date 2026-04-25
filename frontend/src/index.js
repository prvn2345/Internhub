/**
 * CareerBridge — React application entry point.
 * Bootstraps the app, loads i18n, and mounts to #root.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import './i18n/i18n';

const rootElement = document.getElementById('root');
const reactRoot   = ReactDOM.createRoot(rootElement);

reactRoot.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
