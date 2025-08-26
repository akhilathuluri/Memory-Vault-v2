import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';
import { useMemoryStore } from './stores/memoryStore';
import { useCacheLifecycle } from './hooks/useCacheLifecycle';
import { useVaultLock } from './hooks/useVaultLock';
import { NotificationService } from './services/notificationService';
import { MemoryExpirationService } from './services/memoryExpirationService';
import AuthForm from './components/Auth/AuthForm';
import Landing from './pages/Landing';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import Memories from './pages/Memories';
import Files from './pages/Files';
import Search from './pages/Search';
import Settings from './pages/Settings';
import KnowledgeGraph from './pages/KnowledgeGraph';
import VaultLockScreen from './components/Security/VaultLockScreen';


function App() {
  const { user, loading, initialize } = useAuthStore();
  const { startExpirationService, stopExpirationService } = useMemoryStore();
  const { isLocked, isEnabled } = useVaultLock();

  // Log lock state changes for debugging
  useEffect(() => {
    console.log('🔄 App.tsx: Lock state changed:', { isLocked, isEnabled });
  }, [isLocked, isEnabled]);

  // Initialize cache lifecycle management
  useCacheLifecycle();

  useEffect(() => {
    initialize();

    // Initialize notification service
    const initNotifications = async () => {
      try {
        const notificationService = NotificationService.getInstance();
        await notificationService.initialize();
        console.log('✅ Notification service initialized');
      } catch (error) {
        console.error('❌ Failed to initialize notification service:', error);
      }
    };

    initNotifications();
  }, [initialize]);

  // Initialize expiration service when user is authenticated
  useEffect(() => {
    if (user && !isLocked) {
      console.log('🚀 Starting memory expiration service...');
      startExpirationService();

      // Expose services for testing in development
      if (process.env.NODE_ENV === 'development') {
        (window as any).MemoryExpirationService = MemoryExpirationService;
        (window as any).useMemoryStore = useMemoryStore;
        console.log('🧪 Development: Exposed MemoryExpirationService and useMemoryStore to window');
      }

      return () => {
        console.log('🛑 Stopping memory expiration service...');
        stopExpirationService();
      };
    }
  }, [user, isLocked, startExpirationService, stopExpirationService]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-blue-100 flex items-center justify-center">
        <div className="glass-card-strong rounded-2xl p-8 flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200"></div>
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent absolute top-0"></div>
          </div>
          <div className="text-body-medium text-blue-600">Loading MemoryVault...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Router>
        <div className="App min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-blue-100">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<AuthForm />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(16px)',
                color: '#1e293b',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                boxShadow: '0 8px 30px -4px rgba(59, 130, 246, 0.15)',
              },
              success: {
                style: {
                  background: 'rgba(34, 197, 94, 0.1)',
                  backdropFilter: 'blur(16px)',
                  color: '#166534',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                },
              },
              error: {
                style: {
                  background: 'rgba(239, 68, 68, 0.1)',
                  backdropFilter: 'blur(16px)',
                  color: '#dc2626',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                },
              },
            }}
          />
        </div>
      </Router>
    );
  }

  // Show vault lock screen if enabled and locked
  if (user && isEnabled && isLocked) {
    return (
      <div className="App">
        <VaultLockScreen onUnlock={() => {
          console.log('🔓 App.tsx: Unlock callback triggered');
          // The unlock is handled by the VaultLockScreen component
          // No need for local state management
        }} />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(16px)',
              color: '#1e293b',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              boxShadow: '0 8px 30px -4px rgba(59, 130, 246, 0.15)',
            },
            success: {
              style: {
                background: 'rgba(34, 197, 94, 0.1)',
                backdropFilter: 'blur(16px)',
                color: '#166534',
                border: '1px solid rgba(34, 197, 94, 0.2)',
              },
            },
            error: {
              style: {
                background: 'rgba(239, 68, 68, 0.1)',
                backdropFilter: 'blur(16px)',
                color: '#dc2626',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              },
            },
          }}
        />
      </div>
    );
  }

  return (
    <Router>
      <div className="App min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-blue-100">
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="memories" element={<Memories />} />
            <Route path="files" element={<Files />} />
            <Route path="search" element={<Search />} />
            <Route path="knowledge-graph" element={<KnowledgeGraph />} />

            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(16px)',
              color: '#1e293b',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              boxShadow: '0 8px 30px -4px rgba(59, 130, 246, 0.15)',
            },
            success: {
              style: {
                background: 'rgba(34, 197, 94, 0.1)',
                backdropFilter: 'blur(16px)',
                color: '#166534',
                border: '1px solid rgba(34, 197, 94, 0.2)',
              },
            },
            error: {
              style: {
                background: 'rgba(239, 68, 68, 0.1)',
                backdropFilter: 'blur(16px)',
                color: '#dc2626',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              },
            },
          }}
        />
      </div>
    </Router>
  );
}

export default App;