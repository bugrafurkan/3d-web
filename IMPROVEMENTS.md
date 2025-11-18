# Movement & Camera Improvements

## Summary of Changes

This document describes the refactoring done to improve character movement and camera behavior.

## Problems Fixed

### 1. ❌ Jumpy Movement
**Before:** Scroll events directly set character position, causing discrete jumps.

**After:** Smooth interpolation system that continuously moves the character towards the target position.

### 2. ❌ Distant Camera
**Before:** Camera was too far (8 units away, 3 units up), making character look small.

**After:** Proper third-person game camera (4 units away, 2 units up, 60° FOV).

### 3. ❌ Animation Based on Progress
**Before:** Animations switched based on scroll progress value.

**After:** Animations switch based on actual movement speed.

---

## Detailed Changes

### CharacterController.ts

#### New State Variables

```typescript
private targetProgress: number = 0;        // Target from scroll
private currentProgress: number = 0;       // Actual position (smoothed)
private lastZ: number = 0;                 // For speed calculation
private currentSpeed: number = 0;          // Current movement speed
private readonly smoothSpeed: number = 2.0; // Smoothing speed
private readonly idleThreshold: number = 0.01; // Speed threshold for idle
```

#### Method Changes

**`setProgress()` → `setTargetProgress()`**
- Now only sets the target, doesn't directly move the character
- Actual movement happens in `update()` loop

**`updatePosition(delta)`**
- Now takes `delta` time parameter
- Smoothly interpolates `currentProgress` towards `targetProgress`
- Calculates movement speed based on actual position change
- Uses `smoothSpeed` to control interpolation rate

**`updateAnimation()`**
- Now uses `currentSpeed` instead of progress value
- Switches to walk when `speed > idleThreshold`
- Switches to idle when `speed <= idleThreshold`

**`update(delta)`**
- Now calls `updatePosition(delta)` first
- Then updates animations based on calculated speed
- Finally updates the animation mixer

---

### CameraController.ts

#### Camera Configuration Changes

```typescript
// Before:
private offset = new THREE.Vector3(0, 3, 8);
private smoothFactor = 0.1;
FOV = 45°

// After:
private offset = new THREE.Vector3(0, 2, 4);      // Closer, lower
private lookAtOffset = new THREE.Vector3(0, 1, 0); // Look at chest level
private smoothFactor = 0.15;                       // Slightly more responsive
FOV = 60°                                          // Wider, more immersive
```

#### New Feature: Look-At Offset

- Camera now looks at a point slightly above character's feet (chest level)
- This creates a better third-person perspective
- The look-at point is also smoothly interpolated

---

### Experience.ts

#### Minimal Change

```typescript
// Before:
this.characterController.setProgress(progress);

// After:
this.characterController.setTargetProgress(progress);
```

---

## How It Works Now

### Movement Flow

1. **User scrolls** → `ScrollController` updates
2. **ScrollController** calls `setTargetProgress(newValue)`
3. **Every frame:**
   - `currentProgress` smoothly moves towards `targetProgress`
   - Character position is updated based on `currentProgress`
   - Speed is calculated from position delta
   - Animation switches based on speed
   - Mixer updates the active animation

### Camera Flow

1. **Every frame:**
   - Calculate desired position behind character
   - Lerp camera position smoothly
   - Calculate look-at point at character's chest level
   - Lerp look-at target smoothly
   - Update camera orientation

---

## Tuning Parameters

### Movement Smoothness

In `CharacterController.ts`:

```typescript
private readonly smoothSpeed: number = 2.0;
```
- Higher = faster response (more sensitive to scroll)
- Lower = smoother but slower response
- Current value gives nice smooth walking feel

### Animation Threshold

In `CharacterController.ts`:

```typescript
private readonly idleThreshold: number = 0.01;
```
- Speed below this = idle animation
- Speed above this = walk animation
- Adjust if animations switch too frequently

### Camera Distance

In `CameraController.ts`:

```typescript
private offset = new THREE.Vector3(0, 2, 4);
```
- X: left/right (0 = centered behind)
- Y: height (2 = slightly above character)
- Z: distance (4 = 4 units behind)

### Camera Smoothness

In `CameraController.ts`:

```typescript
private smoothFactor = 0.15;
```
- 0 = no smoothing (instant follow, robotic)
- 1 = maximum smoothing (locks to position)
- 0.15 = nice balance for third-person feel

### Camera FOV

In `CameraController.ts`:

```typescript
new THREE.PerspectiveCamera(60, ...)
```
- 45° = narrow (zoomed in feel)
- 60° = balanced (current, game-like)
- 75° = wide (more dramatic)

---

## Testing

1. **Refresh the browser** (already running at http://localhost:3000)
2. **Scroll down slowly** - character should walk smoothly
3. **Scroll down quickly** - character should accelerate but stay smooth
4. **Stop scrolling** - character should decelerate and transition to idle
5. **Camera** - should stay close behind character, following smoothly

---

## Future Enhancements

- [ ] Add rotation to character (face movement direction)
- [ ] Add run animation for fast scrolling
- [ ] Camera shake or bob for more dynamic feel
- [ ] Easing curves for more natural acceleration/deceleration
- [ ] Speed-based animation playback rate (walk faster when moving faster)

