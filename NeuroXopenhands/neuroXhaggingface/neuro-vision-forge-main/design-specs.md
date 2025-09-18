# NeuroChat Fusion - Design Specifications

## Overview
NeuroChat Fusion is a modern dark-themed AI model marketplace and integration platform featuring neon blue and purple accents. This document contains all design system tokens, component specifications, and developer guidelines.

## Design System Tokens (CSS Variables)

### Color Palette
```css
/* Primary Colors */
--bg: 219 24% 9%;           /* #0B0F17 - Main Background */
--surface: 218 30% 11%;     /* #0F1721 - Cards/Surface */
--accent-1: 188 100% 62%;   /* #3FD3FF - Neon Blue */
--accent-2: 258 78% 73%;    /* #9B7CFF - Neon Purple */
--success: 160 100% 44%;    /* #00E0A3 - Token/Success */
--muted: 217 17% 63%;       /* #98A0B3 - Muted Text */
--text-primary: 210 40% 98%; /* Primary text */
--text-secondary: 217 17% 63%; /* Secondary text */
```

### Typography Scale
```css
--fs-xxl: 28px;  /* Headlines */
--fs-xl: 20px;   /* Large text */
--fs-lg: 18px;   /* Medium-large text */
--fs-md: 16px;   /* Body text */
--fs-sm: 14px;   /* Small text */
--fs-xs: 12px;   /* Extra small text */
```

### Spacing Scale
```css
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
--space-xxl: 48px;
```

### Shadows & Effects
```css
--shadow-1: 0 6px 20px rgba(59, 62, 76, 0.4);
--shadow-glow: 0 0 20px rgba(63, 211, 255, 0.3);
--shadow-glow-purple: 0 0 20px rgba(155, 124, 255, 0.3);
--card-radius: 12px;
```

### Layout Constants
```css
--grid-max: 1200px;
--sidebar-width: 220px;
--chat-width: 380px;
```

### Animation Timings
```css
--transition-fast: 200ms ease-out;
--transition-normal: 300ms ease-out;
--transition-slow: 500ms ease-out;
```

## Font Configuration

### Primary Font
- **Family**: Inter (Google Fonts)
- **Weights**: 400 (Regular), 600 (Semi-bold), 700 (Bold)
- **Import**: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');`

### Fallbacks
- System UI fonts: `'Inter', system-ui, sans-serif`

## Component Specifications

### 1. SidebarMain
**Props**: `{ items: MenuItem[] }`
**File**: `src/components/sidebar/SidebarMain.tsx`
**Description**: Fixed left sidebar with navigation menu
**Features**:
- Logo and branding area
- Vertical navigation menu
- Active state highlighting with glow effect
- Prominent CTA styling for "Start Building"

### 2. ModelsGrid
**Props**: `{ models?: Model[], page?: number }`
**File**: `src/components/models/ModelsGrid.tsx`
**Description**: Grid layout for AI model marketplace
**Features**:
- Search functionality
- Filter by budget
- Responsive 3-column grid (desktop), 2-column (tablet), 1-column (mobile)
- Pagination with glowing "Next" button

### 3. ModelCard
**Props**: `{ model: Model, onAddToCollection?: (id: string) => void, onPreview?: (id: string) => void }`
**File**: `src/components/models/ModelCard.tsx`
**Description**: Individual model display card
**Features**:
- Model image with provider overlay
- Rating, latency, and pricing display
- Tag badges with themed colors
- Hover animations and quick actions
- Add to collection functionality

### 4. RightAssistant
**Props**: `{ robotDocked: boolean }`
**File**: `src/components/chat/RightAssistant.tsx`
**Description**: Fixed right-side chat panel
**Features**:
- YOT robot avatar with docking animation
- Message bubbles with timestamps
- File upload and send buttons
- Token counter display
- "Open in VS Code" integration button

### 5. TypewriterIntro
**Props**: `{ onComplete: () => void }`
**File**: `src/components/intro/TypewriterIntro.tsx`
**Description**: Animated intro sequence with YOT robot
**Features**:
- Robot entrance animation (curved path)
- Typewriter text effect with scanning line
- Progressive message revelation
- Smooth transition to docked position

### 6. ModelDetails
**File**: `src/pages/ModelDetails.tsx`
**Description**: Detailed model information page
**Features**:
- Hero section with model info and actions
- Tabbed interface (Overview, Use Cases, Pricing, Reviews, Technical)
- Add to collection and start building CTAs
- Sample prompts and technical specifications

## Animation Specifications

### 1. Robot Entry Animation
```css
@keyframes robotEnter {
  0% {
    transform: translateX(-100px) translateY(100px) scale(0.8);
    opacity: 0;
  }
  50% {
    transform: translateX(50px) translateY(-20px) scale(1.1);
    opacity: 1;
  }
  100% {
    transform: translateX(0) translateY(0) scale(1);
    opacity: 1;
  }
}
```
**Duration**: 900ms ease-out

### 2. Typewriter Effect
- **Character reveal speed**: 40ms per character
- **Cursor blink**: 500ms on/off cycle
- **Scanning line**: 2px height, neon blue gradient

### 3. Hover Interactions
- **Card hover**: `-translate-y-1`, glow shadow
- **Button hover**: `scale(1.03)`, color invert
- **Pagination hover**: Neon glow effect

## Responsive Breakpoints

### Desktop (≥1200px)
- 3-column model grid
- Full sidebar visible
- Fixed right chat panel

### Tablet (768px - 1199px)  
- 2-column model grid
- Collapsible sidebar (hamburger menu)
- Chat panel becomes bottom drawer

### Mobile (<768px)
- Single column layout
- Sidebar becomes bottom navigation
- Chat as floating action button (FAB)

## Accessibility Guidelines

### Color Contrast
- All text meets WCAG AA standards
- Focus states use neon blue outline
- Proper color contrast ratios maintained

### Keyboard Navigation
- All interactive elements keyboard accessible
- Clear focus indicators
- Logical tab order

### ARIA Labels
- Buttons have descriptive labels
- Form inputs properly labeled
- Screen reader friendly

## Asset Requirements

### Icons
- **Logo**: `src/assets/neurochat-logo.png` (512x512)
- **Robot**: `src/assets/yot-robot.png` (512x512)
- **Model samples**: `src/assets/model-sample.png` (512x512)

### Icon Library
- **Primary**: Lucide React icons
- **Style**: Consistent stroke width (2px)
- **Sizes**: 16px, 20px, 24px variants

## Development Guidelines

### File Structure
```
src/
├── components/
│   ├── layout/
│   │   └── AppLayout.tsx
│   ├── sidebar/
│   │   └── SidebarMain.tsx
│   ├── models/
│   │   ├── ModelsGrid.tsx
│   │   └── ModelCard.tsx
│   ├── chat/
│   │   └── RightAssistant.tsx
│   └── intro/
│       └── TypewriterIntro.tsx
├── pages/
│   ├── Models.tsx
│   ├── ModelDetails.tsx
│   ├── MyCollection.tsx
│   ├── StartBuilding.tsx
│   └── CodeEditor.tsx
└── assets/
    ├── neurochat-logo.png
    ├── yot-robot.png
    └── model-sample.png
```

### CSS Class Naming
- **Convention**: kebab-case for custom classes
- **Prefix**: Use `neuro-` prefix for theme-specific classes
- **Examples**: `.neuro-accent-1`, `.neuro-glow-effect`

### Component Props
- Use TypeScript interfaces
- Optional props with default values
- Event handlers with descriptive names

### Import Guidelines
```typescript
// Assets (ES6 imports)
import robotImage from "@/assets/yot-robot.png";

// Components
import { Button } from "@/components/ui/button";

// Icons
import { Search, Filter } from "lucide-react";
```

## Performance Considerations

### Image Optimization
- Use WebP format when possible
- Implement lazy loading for images
- Proper alt text for accessibility

### Animation Performance
- Use CSS transforms over layout properties
- Implement reduced motion preferences
- Optimize animation frame rates

### Bundle Size
- Tree-shake unused icons
- Code splitting for routes
- Optimize component re-renders

## Browser Support

### Target Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Progressive Enhancement
- Core functionality without JavaScript
- Graceful degradation for older browsers
- Mobile-first responsive design

---

**Note**: This design system is built with React, TypeScript, Tailwind CSS, and follows modern web development best practices. All components are designed to be reusable, accessible, and performant.