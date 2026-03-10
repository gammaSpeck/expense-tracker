# PWA Reload Prompt Implementation

## Overview

The app now includes a user-friendly reload prompt that notifies users when a new version is available or when the app is ready to work offline.

## Features

✅ **Smart Update Detection**: Automatically detects when a new version is deployed  
✅ **Sleek Bottom Banner**: Non-intrusive notification positioned above bottom navigation  
✅ **Theme-Matched Design**: Teal accent glow matching the app's dark-first design  
✅ **Auto-Dismiss**: Offline-ready notifications dismiss after 10 seconds  
✅ **Loading States**: Shows updating animation during reload  
✅ **User Control**: Users can update now or dismiss to update later

## Configuration

### Vite Config (`vite.config.ts`)

```typescript
VitePWA({
  registerType: "prompt", // Changed from "autoUpdate"
  manifest: false,
  workbox: {
    globPatterns: ["**/*.{js,css,html,ico,png,svg,webp}"],
  },
});
```

### Component Location

- **Component**: `src/components/ReloadPrompt.tsx`
- **Integrated in**: `src/App.tsx`

## How It Works

### 1. Version Update Flow

When a new version is deployed:

1. Service Worker detects the change
2. Reload prompt slides up from bottom with "New version available!" message
3. User can click "Update Now" to reload with new version
4. User can click "Later" or "X" to dismiss and continue using current version

### 2. Offline Ready Flow

When app is cached and ready for offline use:

1. Prompt shows "App ready to work offline" message
2. Auto-dismisses after 10 seconds if user doesn't interact
3. User can manually dismiss anytime

## Testing the Reload Prompt

### Local Testing (Development)

#### Method 1: Using Build + Preview

```bash
# Terminal 1: Build and serve the app
bun run build
bun run preview

# Terminal 2: Make a code change and rebuild
# Edit any source file (e.g., add a comment in App.tsx)
bun run build

# The reload prompt should appear in the browser
```

#### Method 2: Service Worker Testing

```bash
# 1. Start dev server
bun run dev

# 2. Open browser DevTools > Application > Service Workers
# 3. Check "Update on reload" option
# 4. Make changes and reload to see prompt
```

### Production Testing

1. **Deploy Version 1**:

   ```bash
   bun run build
   # Deploy the dist/ folder to your hosting
   ```

2. **Make Changes**:
   - Edit any source file
   - Update version in `package.json` (optional but recommended)

3. **Deploy Version 2**:

   ```bash
   bun run build
   # Deploy the new dist/ folder
   ```

4. **Test**:
   - Visit the deployed app
   - Wait a few seconds
   - Reload prompt should appear automatically

### Manual Service Worker Testing

Use browser DevTools to manually trigger updates:

```javascript
// In browser console:
navigator.serviceWorker.getRegistration().then((reg) => {
  reg.update(); // Force check for updates
});
```

## Design Details

### Visual Elements

- **Glass Card Effect**: Semi-transparent backdrop with blur
- **Teal Accent**: Bottom glow bar with primary theme color
- **Refresh Icon**: Animated during update process
- **Responsive**: Adapts to mobile and desktop screens

### Positioning

- Fixed at `bottom: 5rem` (above navigation bar)
- Horizontally centered with max-width constraint
- Z-index: 60 (above content, below critical modals)

### Animations

- **Entry**: Slide-in-up animation (300ms)
- **Update**: Spinning refresh icon
- **Exit**: Smooth fade-out

## Best Practices Implemented

✅ **Non-blocking UX**: Users can continue using the app while prompt is visible  
✅ **Clear Messaging**: Distinct messages for updates vs offline-ready  
✅ **Accessibility**: Proper ARIA labels and keyboard navigation  
✅ **Auto-dismiss**: Prevents prompt fatigue for offline-ready notifications  
✅ **Loading States**: Clear feedback during update process  
✅ **Error Handling**: Console logging for debugging SW issues

## Troubleshooting

### Prompt Not Appearing?

1. **Check Service Worker Registration**:

   ```javascript
   navigator.serviceWorker.getRegistrations().then((regs) => console.log(regs));
   ```

2. **Clear SW and Cache**:
   - DevTools > Application > Clear storage
   - Refresh the page

3. **Verify Build Output**:
   - Check that `dist/sw.js` exists after build
   - Verify console shows "SW Registered"

### Update Not Working?

1. **Check Network**:
   - Ensure app can reach the server
   - Verify new version is actually deployed

2. **Force Update**:
   - DevTools > Application > Service Workers > "Update"

3. **Inspect Console**:
   - Look for SW registration errors
   - Check for failed fetch requests

## Future Enhancements

Potential improvements:

- [ ] Show version number in prompt
- [ ] Add changelog link
- [ ] Configurable auto-dismiss timeout
- [ ] Analytics tracking for update acceptance rate
- [ ] Progressive disclosure of new features

## References

- [Vite PWA Plugin Docs](https://vite-pwa-org.netlify.app/)
- [Workbox Documentation](https://developer.chrome.com/docs/workbox/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
