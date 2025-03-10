import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';

// Components
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/Dashboard';
import NoteEditor from './components/notes/NoteEditor';
import Layout from './components/layout/Layout';
import AdminPortal from './components/admin/AdminPortal';
import PasswordManager from './components/passwords/PasswordManager';

const AppContent = () => {
  const { darkMode } = useTheme();
  
  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#2196f3',
      },
      secondary: {
        main: '#f50057',
      },
    },
  });

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <ErrorBoundary>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/admin" element={<AdminPortal />} />
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/notes/:id"
                element={
                  <PrivateRoute>
                    <Layout>
                      <NoteEditor />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/passwords"
                element={
                  <PrivateRoute>
                    <Layout>
                      <PasswordManager />
                    </Layout>
                  </PrivateRoute>
                }
              />
            </Routes>
          </ErrorBoundary>
        </Router>
      </AuthProvider>
    </MuiThemeProvider>
  );
};

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App; 