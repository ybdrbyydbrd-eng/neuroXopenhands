import React, { useState, useRef, useEffect } from 'react';

// Styles for the component
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  
  topNav: {
    background: '#fff',
    borderBottom: '1px solid #e1e5e9',
    padding: '12px 24px',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  
  navBrand: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#2563eb',
  },
  
  navActions: {
    display: 'flex',
    gap: '12px',
  },
  
  navButton: {
    padding: '8px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    background: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  
  navButtonActive: {
    background: '#2563eb',
    color: 'white',
    borderColor: '#2563eb',
  },
  
  mainContent: {
    marginTop: '60px',
    height: 'calc(100vh - 60px)',
    display: 'flex',
    flexDirection: 'column',
  },
  
  defaultContent: {
    padding: '40px',
    textAlign: 'center',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  neuroChatContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    background: 'white',
  },
  
  neuroChatIframe: {
    width: '100%',
    height: '100%',
    border: 'none',
    background: 'white',
  },
  
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(255, 255, 255, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    color: '#6b7280',
  },
  
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid #e5e7eb',
    borderTop: '2px solid #2563eb',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginRight: '8px',
  },
  
  errorContainer: {
    textAlign: 'center',
    color: '#ef4444',
    fontWeight: 500,
  },
  
  retryButton: {
    marginTop: '12px',
    padding: '6px 12px',
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};

const NeuroChatIntegration = ({ 
  brandName = 'Your Application',
  neuroChatUrl = 'http://localhost:3000',
  onModeChange,
  defaultMode = 'dashboard'
}) => {
  const [currentMode, setCurrentMode] = useState(defaultMode);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const iframeRef = useRef(null);

  // Handle mode switching
  const switchMode = (mode) => {
    setCurrentMode(mode);
    setError(null);
    
    if (onModeChange) {
      onModeChange(mode);
    }

    // Update URL hash for bookmarking
    window.history.pushState({ mode }, '', `#${mode}`);
  };

  // Handle NeuroChat iframe loading
  const handleIframeLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setError(`Failed to load NeuroChat from ${neuroChatUrl}`);
  };

  // Check if NeuroChat is available
  const checkNeuroChatAvailability = async () => {
    try {
      const response = await fetch(`${neuroChatUrl}/health`);
      return response.ok;
    } catch (error) {
      console.warn('NeuroChat health check failed:', error);
      return false;
    }
  };

  // Initialize mode from URL hash
  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const validModes = ['dashboard', 'agent', 'settings'];
    if (validModes.includes(hash) && hash !== currentMode) {
      setCurrentMode(hash);
    }
  }, [currentMode]);

  // Handle browser navigation
  useEffect(() => {
    const handlePopState = (event) => {
      const mode = event.state?.mode || 'dashboard';
      setCurrentMode(mode);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Periodic health check for NeuroChat
  useEffect(() => {
    if (currentMode !== 'agent') return;

    const interval = setInterval(async () => {
      const isAvailable = await checkNeuroChatAvailability();
      if (!isAvailable) {
        console.warn('NeuroChat appears to be unavailable');
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [currentMode, neuroChatUrl]);

  // Handle iframe load when switching to agent mode
  useEffect(() => {
    if (currentMode === 'agent' && iframeRef.current) {
      setIsLoading(true);
      setError(null);
    }
  }, [currentMode]);

  // Render navigation button
  const NavButton = ({ mode, children, onClick }) => {
    const isActive = currentMode === mode;
    const buttonStyle = {
      ...styles.navButton,
      ...(isActive ? styles.navButtonActive : {}),
    };

    return (
      <button style={buttonStyle} onClick={() => onClick(mode)}>
        {children}
      </button>
    );
  };

  // Render default content
  const renderDefaultContent = () => {
    const content = {
      dashboard: {
        title: 'Dashboard',
        message: 'Your main dashboard content would go here'
      },
      settings: {
        title: 'Settings', 
        message: 'Settings panel would go here'
      }
    };

    const { title, message } = content[currentMode] || content.dashboard;

    return (
      <div style={styles.defaultContent}>
        <h1>{title}</h1>
        <p>{message}</p>
        {currentMode === 'dashboard' && (
          <div style={{
            background: '#f0f9ff',
            padding: '20px',
            borderRadius: '8px',
            borderLeft: '4px solid #2563eb',
            marginTop: '20px',
            maxWidth: '600px'
          }}>
            <h3 style={{ color: '#1e40af', marginBottom: '8px' }}>
              NeuroChat Integration
            </h3>
            <p style={{ color: '#374151', fontSize: '14px' }}>
              NeuroChat (formerly OpenHands) is now integrated into your application. 
              Switch to Agent mode to access the full AI development environment.
            </p>
          </div>
        )}
      </div>
    );
  };

  // Render NeuroChat iframe
  const renderNeuroChat = () => (
    <div style={styles.neuroChatContainer}>
      <iframe
        ref={iframeRef}
        src={neuroChatUrl}
        title="NeuroChat AI Agent Interface"
        style={styles.neuroChatIframe}
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        allow="clipboard-read; clipboard-write"
        sandbox="allow-same-origin allow-scripts allow-forms allow-downloads allow-popups"
      />
      
      {(isLoading || error) && (
        <div style={styles.loadingOverlay}>
          {isLoading && !error && (
            <>
              <div style={styles.spinner}></div>
              Loading NeuroChat...
            </>
          )}
          
          {error && (
            <div style={styles.errorContainer}>
              <div>Failed to load NeuroChat</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                Check that NeuroChat is running at: {neuroChatUrl}
              </div>
              <button 
                style={styles.retryButton}
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Add spinner keyframes to document head */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      
      <div style={styles.container}>
        {/* Top Navigation Bar */}
        <nav style={styles.topNav}>
          <div style={styles.navBrand}>{brandName}</div>
          <div style={styles.navActions}>
            <NavButton mode="dashboard" onClick={switchMode}>
              Dashboard
            </NavButton>
            <NavButton mode="agent" onClick={switchMode}>
              AI Agent
            </NavButton>
            <NavButton mode="settings" onClick={switchMode}>
              Settings
            </NavButton>
          </div>
        </nav>

        {/* Main Content Area */}
        <main style={styles.mainContent}>
          {currentMode === 'agent' ? renderNeuroChat() : renderDefaultContent()}
        </main>
      </div>
    </>
  );
};

export default NeuroChatIntegration;

// Usage example:
/*
import NeuroChatIntegration from './NeuroChatIntegration';

function App() {
  const handleModeChange = (mode) => {
    console.log('Mode changed to:', mode);
    // You can add custom logic here
  };

  return (
    <NeuroChatIntegration
      brandName="My Application"
      neuroChatUrl="http://localhost:3000"
      onModeChange={handleModeChange}
      defaultMode="dashboard"
    />
  );
}
*/