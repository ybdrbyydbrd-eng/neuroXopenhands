# NeuroChat Integration Guide

This guide shows you how to integrate the NeuroChat iframe into your existing application, replacing the old OpenHands iframe while keeping your top navigation visible.

## 🚀 Quick Start

### Option 1: HTML/JavaScript Integration

If you're using plain HTML/JavaScript, use the `neurochat-integration-example.html` file as a reference.

1. **Copy the HTML structure**:
```html
<nav class="top-nav">
  <!-- Your existing navigation -->
</nav>

<main class="main-content">
  <div class="neurochat-container" id="neuroChatContainer">
    <iframe 
      id="neuroChatIframe"
      src="http://localhost:3000"
      title="NeuroChat AI Agent Interface"
      allow="clipboard-read; clipboard-write"
      sandbox="allow-same-origin allow-scripts allow-forms allow-downloads allow-popups">
    </iframe>
  </div>
</main>
```

2. **Update the configuration**:
```javascript
const NEUROCHAT_CONFIG = {
  baseUrl: 'http://localhost:3000', // Your NeuroChat URL
  getIframeUrl: function() {
    return this.baseUrl;
  }
};
```

### Option 2: React Integration

If you're using React, use the `NeuroChatIntegration.jsx` component:

```jsx
import NeuroChatIntegration from './NeuroChatIntegration';

function App() {
  return (
    <NeuroChatIntegration
      brandName="Your App Name"
      neuroChatUrl="http://localhost:3000"
      onModeChange={(mode) => console.log('Mode:', mode)}
    />
  );
}
```

## ⚙️ Configuration Options

### HTML/JavaScript Version
```javascript
const NEUROCHAT_CONFIG = {
  // NeuroChat server URL
  baseUrl: 'http://localhost:3000',
  
  // Custom URL generation (optional)
  getIframeUrl: function() {
    // Add authentication or session parameters if needed
    return this.baseUrl + '?token=your-auth-token';
  }
};
```

### React Version Props
```jsx
<NeuroChatIntegration
  brandName="Your Application"        // Top navigation brand name
  neuroChatUrl="http://localhost:3000" // NeuroChat server URL
  onModeChange={handleModeChange}      // Callback when switching modes
  defaultMode="dashboard"              // Initial mode: dashboard|agent|settings
/>
```

## 🔧 Customization

### Styling
Both versions use inline styles for simplicity, but you can:

1. **Extract to CSS classes**:
```css
.neurochat-nav {
  background: #fff;
  border-bottom: 1px solid #e1e5e9;
  /* ... your styles */
}
```

2. **Integrate with your design system**:
```javascript
// Replace the styles object with your CSS classes
const styles = {
  topNav: 'your-nav-class',
  navButton: 'your-button-class',
  // ...
};
```

### Navigation Integration
To integrate with your existing navigation:

```javascript
// HTML/JS version
function switchMode(mode) {
  // Your existing navigation logic
  updateYourNavigation(mode);
  
  // NeuroChat specific logic
  if (mode === 'agent') {
    showNeuroChat();
  } else {
    showYourContent();
  }
}
```

```jsx
// React version
const handleModeChange = (mode) => {
  // Update your app state
  setCurrentAppMode(mode);
  
  // Additional logic
  if (mode === 'agent') {
    // Analytics, logging, etc.
    trackEvent('neurochat_opened');
  }
};
```

## 🔐 Security Considerations

### Iframe Security
The iframe includes security attributes:
```html
<iframe 
  sandbox="allow-same-origin allow-scripts allow-forms allow-downloads allow-popups"
  allow="clipboard-read; clipboard-write">
```

### Cross-Origin Communication
For secure messaging between your app and NeuroChat:

```javascript
// Listen for messages from NeuroChat
window.addEventListener('message', function(event) {
  // Verify origin for security
  if (event.origin !== 'http://localhost:3000') {
    return;
  }
  
  const message = event.data;
  console.log('Message from NeuroChat:', message);
});

// Send messages to NeuroChat
function sendToNeuroChat(data) {
  const iframe = document.getElementById('neuroChatIframe');
  if (iframe.contentWindow) {
    iframe.contentWindow.postMessage(data, 'http://localhost:3000');
  }
}
```

## 🚦 Error Handling

### Connection Issues
Both versions include:
- Loading states with spinners
- Error handling with retry buttons
- Health check functionality

### Custom Error Handling
```javascript
// HTML/JS version
neuroChatIframe.onerror = function() {
  // Your custom error handling
  showCustomErrorMessage();
  logErrorToAnalytics();
};

// React version
const handleIframeError = () => {
  setError('Custom error message');
  // Your error handling logic
};
```

## 📱 Responsive Design

Both versions include responsive breakpoints:
```css
@media (max-width: 768px) {
  .top-nav {
    padding: 8px 16px;
  }
  
  .nav-button {
    padding: 6px 12px;
    font-size: 12px;
  }
}
```

## 🔄 State Management

### URL-based Navigation
Both versions support:
- Browser back/forward navigation
- Bookmarkable URLs with hash routing
- State persistence across page reloads

### Integration with Your Router
If you're using React Router or similar:

```jsx
import { useLocation, useNavigate } from 'react-router-dom';

function YourApp() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const handleModeChange = (mode) => {
    navigate(`/your-path#${mode}`);
  };
  
  return (
    <NeuroChatIntegration 
      onModeChange={handleModeChange}
      defaultMode={location.hash.substring(1) || 'dashboard'}
    />
  );
}
```

## 🐛 Troubleshooting

### Common Issues

1. **NeuroChat not loading**:
   - Verify the Docker container is running: `docker ps`
   - Check the URL: `http://localhost:3000/health`
   - Check browser console for CORS errors

2. **Iframe not displaying**:
   - Check if your site allows iframes
   - Verify the iframe `src` attribute is set
   - Check for CSS `display: none` issues

3. **Navigation not working**:
   - Verify JavaScript event listeners are attached
   - Check browser console for errors
   - Test with browser developer tools

### Debug Mode
Add this to enable debug logging:
```javascript
// HTML/JS version
const DEBUG_MODE = true;
if (DEBUG_MODE) {
  console.log('Current mode:', currentMode);
  console.log('NeuroChat URL:', NEUROCHAT_CONFIG.baseUrl);
}
```

## 📞 Support

If you need help:
1. Check the browser console for error messages
2. Verify NeuroChat is running: `http://localhost:3000/health`
3. Test the iframe URL directly in a new browser tab
4. Check network requests in browser developer tools

---

## 📋 Quick Checklist

- [ ] NeuroChat Docker container is running
- [ ] Updated the `neuroChatUrl` in configuration
- [ ] Navigation buttons work correctly
- [ ] Iframe loads without errors
- [ ] Responsive design works on mobile
- [ ] Browser back/forward navigation works
- [ ] Error states display correctly