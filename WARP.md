# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is the **OpenHands frontend**, a modern React-based web application that provides the user interface for the OpenHands AI agent platform. The project is built with React Router v7 (Remix SPA Mode), TypeScript, and a comprehensive set of modern web development tools.

## Development Commands

### Installation & Setup
```bash
# Navigate to the frontend directory
cd NeuroXopenhands/openhands-main/frontend

# Install dependencies (requires Node.js 20.x or later)
npm install
```

### Development & Build
```bash
# Start development server with mocked backend (recommended for frontend development)
npm run dev:mock

# Start development server with SaaS mode simulation
npm run dev:mock:saas

# Start development server connecting to real backend
npm run dev

# Build for production
npm run build

# Serve production build
npm start
```

### Testing
```bash
# Run unit tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run end-to-end tests with Playwright
npm run test:e2e

# Run single test file
npx vitest run path/to/test.spec.ts

# Watch mode for specific test
npx vitest path/to/test.spec.ts
```

### Code Quality
```bash
# Run type checking
npm run typecheck

# Run linting
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Check translation completeness
npm run check-translation-completeness
```

## Architecture & Structure

### Tech Stack
- **Framework**: React Router v7 (Remix SPA Mode) with React 19
- **Build Tool**: Vite
- **Language**: TypeScript
- **State Management**: Redux Toolkit + TanStack Query
- **Styling**: Tailwind CSS + HeroUI components
- **Testing**: Vitest + React Testing Library + Playwright
- **Mocking**: Mock Service Worker (MSW)
- **Internationalization**: i18next

### Core Directory Structure
```
src/
├── api/          # API calls and type definitions
├── components/   # React components organized by domain/feature
├── context/      # React context providers for local state
├── hooks/        # Custom React hooks
├── i18n/         # Internationalization setup and translations
├── mocks/        # MSW mocks for development
├── routes/       # File-based routing (React Router v7)
├── state/        # Redux slices for global state
├── types/        # TypeScript type definitions
└── utils/        # Utility functions
```

### State Management Architecture

The application uses **Redux Toolkit** for global state management with the following slices:
- `agent-slice`: Current AI agent state
- `browser-slice`: Browser/file explorer state
- `code-slice`: Code editor and syntax highlighting
- `command-slice`: Terminal command execution
- `conversation-slice`: Chat/conversation management
- `file-state-slice`: File system operations
- `jupyter-slice`: Jupyter notebook integration
- `microagent-management-slice`: Microagent configuration
- `status-slice`: Application status and loading states
- `metrics-slice`: Performance and usage metrics

### API Layer

- **Base Client**: `open-hands-axios.ts` - Configured Axios instance with interceptors
- **Types**: `open-hands.types.ts` - Comprehensive type definitions for API responses
- **Real-time**: WebSocket connections for live updates from the backend
- **Mocking**: MSW handlers in `/mocks` for development without backend

### Component Architecture

Components are organized by **domain/feature**:
```
components/
├── features/     # Domain-specific components (chat, file-explorer, etc.)
├── layout/       # Layout and navigation components  
├── modals/       # Modal dialogs
└── ui/           # Shared, reusable UI components
```

### Development Modes

1. **Mock Mode** (`npm run dev:mock`): Uses MSW to simulate backend - ideal for frontend development
2. **SaaS Mock Mode** (`npm run dev:mock:saas`): Simulates SaaS environment with authentication
3. **Connected Mode** (`npm run dev`): Connects to actual backend running on localhost:3000

## Environment Configuration

Copy `.env.sample` to `.env` and configure:

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_BACKEND_BASE_URL` | Backend hostname for WebSocket | `localhost:3000` |
| `VITE_BACKEND_HOST` | Backend host for API calls | `127.0.0.1:3000` |
| `VITE_MOCK_API` | Enable MSW mocking | `false` |
| `VITE_MOCK_SAAS` | Simulate SaaS mode | `false` |
| `VITE_USE_TLS` | Use HTTPS/WSS | `false` |
| `VITE_FRONTEND_PORT` | Frontend port | `3001` |

## Testing Strategy

### Unit Tests (Vitest + RTL)
- Use `renderWithProviders()` for components that need Redux/providers
- Test user interactions with `@testing-library/user-event`
- Mock external dependencies and API calls with MSW
- Focus on behavior over implementation details

### E2E Tests (Playwright)
- Configured to run against development server with mocks
- Tests run in Chromium, Firefox, and WebKit
- Automatic server startup for CI environments

### Key Testing Utilities
- `test-utils.tsx`: Custom render functions with providers
- `vitest.setup.ts`: Global test configuration
- `/mocks`: MSW request handlers for API mocking

## Code Quality Standards

### ESLint Configuration
- **Base**: Airbnb TypeScript rules
- **Plugins**: Prettier, unused-imports, i18next
- **Key Rules**: 
  - `i18next/no-literal-string`: Enforces internationalization
  - Strict TypeScript settings with project-specific overrides

### TypeScript Configuration
- **Target**: ES2022 with DOM libraries
- **Module Resolution**: Bundler mode for Vite compatibility
- **Path Aliases**: `#/*` maps to `./src/*`
- **Strict Mode**: Enabled with comprehensive type checking

## Development Workflow

1. **Feature Development**: Start with `npm run dev:mock` for isolated frontend work
2. **Testing**: Write tests alongside features - both unit and integration
3. **Type Safety**: Run `npm run typecheck` regularly
4. **Code Quality**: Use `npm run lint:fix` before commits
5. **Internationalization**: All user-facing strings must use i18next keys
6. **State Management**: Use Redux for global state, React hooks for local state
7. **API Integration**: Utilize MSW mocks during development, ensure real API compatibility

## Real-time Features

The application heavily relies on **WebSocket connections** for:
- Live updates from AI agents
- Real-time file system changes  
- Terminal output streaming
- Conversation status updates

## Performance Considerations

- **Vite Optimizations**: Pre-bundled dependencies configured in `vite.config.ts`
- **Code Splitting**: Automatic via React Router file-based routing
- **Bundle Analysis**: Monitor bundle size and lazy-load heavy components
- **WebSocket Management**: Proper connection lifecycle in hooks/context