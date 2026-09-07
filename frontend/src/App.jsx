import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { MainLayout } from './components/layout/MainLayout';
import { SplashScreen } from './components/layout/SplashScreen';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import TasksPage from './pages/TasksPage';
import ReviewsPage from './pages/ReviewsPage';
import UsersPage from './pages/UsersPage';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" />;
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();
  
  return (
    <Routes>
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
      
      <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="reviews" element={<ReviewsPage />} />
        <Route path="users" element={<ProtectedRoute allowedRoles={['CEO', 'CTO']}><UsersPage /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
};

const AppContent = () => {
  const { loading } = useAuth();
  const [minSplashTimeDone, setMinSplashTimeDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinSplashTimeDone(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);
  
  if (loading || !minSplashTimeDone) {
    return <SplashScreen />;
  }
  
  return (
    <WebSocketProvider>
      <AppRoutes />
    </WebSocketProvider>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
