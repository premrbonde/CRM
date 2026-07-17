import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import { store, useAppSelector } from './store';
import theme from './theme';

// Layout & Pages
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LogInteraction from './pages/LogInteraction';
import History from './pages/History';
import DoctorProfile from './pages/DoctorProfile';
import Settings from './pages/Settings';
import Calendar from './pages/Calendar';
import Products from './pages/Products';
import NotFound from './pages/NotFound';

// Protected Route Guard
function PrivateRoute({ children }: { children: React.ReactElement }) {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Route */}
        <Route path="/login" element={<Login />} />

        {/* Dashboard and Core App Routes wrapped in Layout and Route Guards */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="log" element={<LogInteraction />} />
          <Route path="chat" element={<LogInteraction />} /> {/* Sharing Log screen for tab index 1 */}
          <Route path="history" element={<History />} />
          <Route path="doctors" element={<DoctorProfile />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="products" element={<Products />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <AppRoutes />
      </ThemeProvider>
    </Provider>
  );
}
