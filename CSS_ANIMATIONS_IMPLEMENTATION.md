# CSS-Only Animations Implementation

## Overview
Added performant CSS-only animations to the mobile menu and page selector sheet (fly-out tray) with 60fps performance targets using GPU-accelerated transforms.

## Changes Made

### 1. Global CSS Animations (`web/src/app/globals.css`)

Added comprehensive CSS animations optimized for 60fps performance:

#### Mobile Menu Animations
- **Keyframes**: `mobile-menu-enter` and `mobile-menu-exit`
- **Animation**: Slide down from top using `translate3d(0, -100%, 0)` → `translate3d(0, 0, 0)`
- **Duration**: 250ms enter, 200ms exit
- **Easing**: `cubic-bezier(0.16, 1, 0.3, 1)` for smooth, natural motion

#### Backdrop Animations
- **Keyframes**: `backdrop-enter` and `backdrop-exit`
- **Animation**: Fade in/out using opacity
- **Duration**: 200ms enter, 150ms exit

#### Sheet/Drawer Animations
- **Sides Supported**: right, left, top, bottom
- **Animation**: Slide from respective side using `translate3d()`
- **Duration**: 300ms enter, 250ms exit
- **Easing**: `cubic-bezier(0.16, 1, 0.3, 1)` for enter, `cubic-bezier(0.4, 0, 1, 1)` for exit

### 2. Navigation Sidebar (`web/src/components/navigation-sidebar.tsx`)

Enhanced mobile menu with CSS animation state management:

#### State Management
- `mobileMenuOpen`: Tracks open/closed state
- `isAnimating`: Determines which animation class to apply
- `shouldRender`: Controls DOM mounting/unmounting

#### Animation Flow
1. **Opening**:
   - Set `shouldRender=true` to mount DOM
   - Use `requestAnimationFrame` (double RAF) to ensure DOM is ready
   - Set `mobileMenuOpen=true` and `isAnimating=true` to trigger enter animation
   
2. **Closing**:
   - Set `isAnimating=false` and `mobileMenuOpen=false` to trigger exit animation
   - Wait 200ms (exit animation duration) before unmounting DOM
   - Prevents content flash during animation

#### Content Pre-loading
- Content is rendered in DOM before animation starts
- Double `requestAnimationFrame` ensures browser reflow completes
- Eliminates jank and ensures smooth 60fps animation

### 3. Sheet Component (`web/src/components/ui/sheet.tsx`)

Enhanced Radix UI Sheet with performance optimizations:

#### Added Features
- `data-side` attribute on content for CSS selector targeting
- Inline GPU acceleration styles:
  - `willChange: 'transform'` for content
  - `willChange: 'opacity'` for overlay
  - `backfaceVisibility: 'hidden'`
  - `transform: 'translate3d(0, 0, 0)'` to force GPU layer

#### CSS Selector Strategy
- Uses `[data-state="open"][data-radix-dialog-content][data-side="right"]` pattern
- Automatically applies correct animation based on side prop
- No JavaScript animation logic needed

## Performance Optimizations

### GPU Acceleration
All animations use compositor-only properties:
- ✅ `transform` (translate3d, translateX, translateY)
- ✅ `opacity`
- ❌ Avoiding: width, height, left, right, top, bottom

### Techniques Used
1. **Hardware Acceleration**: `transform: translate3d(0, 0, 0)` forces GPU layer
2. **Backface Culling**: `backface-visibility: hidden` prevents flickering
3. **Will-Change**: Hints browser to optimize for animation properties
4. **CSS Containment**: Used in other components for layout isolation
5. **Double RAF**: Ensures DOM is ready before triggering CSS transitions

### Accessibility
- Respects `prefers-reduced-motion: reduce` media query
- All animations disabled for users who prefer reduced motion
- Proper ARIA labels maintained

## Animation Timings

| Element | Enter Duration | Exit Duration | Total (Round Trip) |
|---------|---------------|---------------|-------------------|
| Mobile Menu | 250ms | 200ms | 450ms |
| Backdrop | 200ms | 150ms | 350ms |
| Sheet/Drawer | 300ms | 250ms | 550ms |

All timings are optimized for perceived performance while maintaining smooth motion.

## Browser Compatibility

### Modern Features Used
- CSS `translate3d()` - Supported in all modern browsers
- CSS `will-change` - Supported in all modern browsers
- CSS `backface-visibility` - Supported in all modern browsers
- Radix UI Dialog primitives - Full browser support

### Fallbacks
- `prefers-reduced-motion` support with graceful degradation
- Standard CSS fallbacks ensure functionality without animations

## Testing Recommendations

1. **Test on Mobile Devices**: Verify 60fps on actual hardware
2. **Test Reduced Motion**: Enable in OS settings and verify animations disable
3. **Test Multiple Browsers**: Chrome, Safari, Firefox, Edge
4. **Test Performance**: Use Chrome DevTools Performance tab to verify GPU acceleration
5. **Test Rapid Clicks**: Ensure animations don't break with fast toggling

## Performance Metrics Target

- **Target**: Consistent 60fps (16.67ms frame time)
- **GPU Acceleration**: ✅ Enabled via translate3d
- **Main Thread**: Minimal JavaScript, CSS-driven animations
- **Jank**: Eliminated via content pre-loading and RAF timing
- **Repaints**: Minimized by using compositor properties only

## Future Enhancements

Potential improvements if needed:
1. Add spring physics for more natural motion (via CSS cubic-bezier tuning)
2. Add swipe gestures for mobile menu dismissal
3. Adjust timing curves based on user feedback
4. Consider view transitions API for future browser support

