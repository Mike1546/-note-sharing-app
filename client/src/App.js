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
import RequireRole from './components/RequireRole';
import PasswordManager from './components/passwords/PasswordManager';
import Calendar from './components/calendar/Calendar';
import AppwriteTest from './components/AppwriteTest';

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
        <Router basename={(function(){
          const raw = process.env.PUBLIC_URL || '/';
          // If PUBLIC_URL is an absolute URL, extract just the pathname for basename
          try {
            const url = new URL(raw, window.location.origin);
            let path = url.pathname || '/';
            if (path.endsWith('/') && path !== '/') path = path.slice(0, -1);
            return path || '/';
          } catch (e) {
            // Fallback: assume raw is already a pathname
            return raw;
          }
        })()}>
          <ErrorBoundary>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/admin" element={<RequireRole roles={["admin","developer"]}><AdminPortal /></RequireRole>} />
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
              <Route
                path="/calendar"
                element={
                  <PrivateRoute>
                    <Layout>
                      <Calendar />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route path="/appwrite-test" element={<AppwriteTest />} />
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