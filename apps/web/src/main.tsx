import React from 'react';
import ReactDOM from 'react-dom/client';

import { App } from './app/App';
import { AppProviders } from './app/providers/AppProviders';
import { applyAppThemeCssVariables } from './app/theme';
import './app/styles/global.css';
import './app/styles/workbench-16x9.css';
import './app/styles/workbench-summary.css';

applyAppThemeCssVariables(document.documentElement);

const root = document.getElementById('root');

if (!root) {
  throw new Error('未找到应用挂载节点 #root');
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>,
);
