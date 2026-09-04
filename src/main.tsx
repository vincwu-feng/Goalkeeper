/**
 * GoalKeeper - browser-only interactive build.
 *
 * Two capabilities are injected at the root level:
 * 1. A data layer that answers the REST routes App.tsx calls
 *    (session list, artifact read, version list, rollback) from local sample data.
 * 2. A guided tour that spotlights real UI elements and explains each product idea.
 */
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './demo/coachmark.css';
import { installDemoApi } from './demo/mock-api';
import Coachmark from './demo/Coachmark';

installDemoApi();

const root = document.getElementById('root')!;
const app = createRoot(root);
app.render(
  <>
    <Coachmark />
    <App />
  </>,
);