# Animation Performance Diagnosis

## Quick Test to Identify the Issue

To determine if the slow performance is from the **animation** or the **content**:

### Test 1: Empty Sheet Animation
1. Open Chrome DevTools (F12)
2. Go to Performance tab
3. Click "Record" (circle button)
4. Open the "Change Page" sheet
5. Stop recording
6. Look at the timeline:
   - **Green bars (Painting)**: If these are long, it's content causing repaints
   - **Purple bars (Rendering/Layout)**: If these are long, it's layout thrashing
   - **Animation frames**: Should be ~60fps (16.67ms per frame)

### Test 2: Check GPU Acceleration
1. Open DevTools
2. Go to "More tools" > "Rendering"
3. Enable "Paint flashing"
4. Open the sheet - you should see:
   - **GREEN flash**: GPU-accelerated (good!)
   - **RED flash**: Software rendering (bad - means no GPU acceleration)

### Test 3: Simple Content Test
Temporarily replace the sheet content with a simple div to test animation only:

```tsx
<SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">
  <div>Simple test content</div>
</SheetContent>
```

If this is smooth, the problem is the **content rendering**, not the animation.

## Current Optimizations Applied

### Animation Layer (✅ Done)
- GPU-accelerated with `translate3d()`
- `willChange: 'transform'` hint
- `backfaceVisibility: 'hidden'`
- `contain: 'layout style paint'` for isolation

### Content Layer (Already Pre-rendered)
- Content is pre-rendered in background via `shouldPreRender` state
- PageGridSelector caches previews
- Memoized components to prevent re-renders

## Likely Culprits

### 1. **Content is Heavy** (Most Likely)
The PageGridSelector renders multiple:
- VestaboardDisplay components (mini board previews)
- Each with mask gradients and complex layouts
- Multiple API preview fetches

**Evidence**: The pre-render helps, but opening still feels slow

### 2. **Webkit Mask Performance**
```tsx
maskImage: 'linear-gradient(to right, black 60%, transparent 100%)'
```
This is applied to every page button preview and can be expensive.

### 3. **Overflow: Auto + Complex Content**
The sheet has `overflow-y-auto` with heavy scrollable content, which can cause layout thrashing.

## Recommended Next Steps

### Option A: Lazy Load Content After Animation
Only show content AFTER the slide animation completes:

```tsx
const [showContent, setShowContent] = useState(false);

useEffect(() => {
  if (isSheetOpen) {
    // Wait for animation to complete before showing content
    setTimeout(() => setShowContent(true), 300);
  } else {
    setShowContent(false);
  }
}, [isSheetOpen]);
```

### Option B: Simplified Preview Grid
- Remove the webkit mask gradients (heavy)
- Use CSS visibility instead of DOM mounting
- Reduce number of previews shown initially (virtualization)

### Option C: Skeleton During Animation
Show lightweight skeletons during animation, then swap to real content:

```tsx
{isAnimating ? <SkeletonGrid /> : <PageGridSelector />}
```

## Performance Targets

- **Animation**: 60fps (16.67ms per frame) ✅ Should be achievable
- **Content Load**: < 100ms ⚠️ Currently heavy
- **Combined**: Feels instant to user ⚠️ Need to separate concerns

## Diagnosis Result

Based on the code review:
- **Animation is optimized** ✅
- **Content is pre-rendered** ✅
- **Problem**: Content is still too heavy to animate smoothly with

**Recommendation**: Defer content visibility until after animation completes (Option A)

