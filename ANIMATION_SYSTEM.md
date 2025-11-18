# Animation System - Separate Model and Animation Files

## Overview

The character system now loads THREE separate GLB files:

1. **`/models/character_base.glb`** - Base character model (rendered in scene)
2. **`/models/character_idle.glb`** - Idle animation (extracted only)
3. **`/models/character_walk.glb`** - Walk animation (extracted only)

Only the base model is added to the scene. The animation files are loaded solely to extract their animation clips.

---

## How It Works

### Loading Sequence

```typescript
async loadCharacterAndAnimations() {
  // 1. Load base model
  const baseGltf = await loader.loadAsync('/models/character_base.glb');
  
  // 2. Load animation files in parallel
  const [idleGltf, walkGltf] = await Promise.all([
    loader.loadAsync('/models/character_idle.glb'),
    loader.loadAsync('/models/character_walk.glb')
  ]);
  
  // 3. Add ONLY base model to scene
  this.object3D = baseGltf.scene;
  this.scene.add(this.object3D);
  
  // 4. Extract animations from separate files
  this.setupAnimationsFromFiles(idleGltf, walkGltf);
}
```

### Animation Extraction

```typescript
setupAnimationsFromFiles(idleGltf, walkGltf) {
  // Create mixer on base model
  this.mixer = new THREE.AnimationMixer(this.object3D);
  
  // Extract idle clip (first animation from idle file)
  const idleClip = idleGltf.animations[0];
  this.idleAction = this.mixer.clipAction(idleClip);
  this.idleAction.play();
  
  // Extract walk clip (first animation from walk file)
  const walkClip = walkGltf.animations[0];
  this.walkAction = this.mixer.clipAction(walkClip);
}
```

---

## Key Changes from Previous Version

### Before (Single File)
```typescript
// Old: Single file with all animations
private readonly modelPath = '/models/character.glb';

// Loaded everything at once
const gltf = await loader.loadAsync(modelPath);
// Found animations by name matching
const idleClip = gltf.animations.find(clip => 
  clip.name.toLowerCase().includes('idle')
);
```

### After (Separate Files)
```typescript
// New: Three separate files
private readonly baseModelPath = '/models/character_base.glb';
private readonly idleAnimPath = '/models/character_idle.glb';
private readonly walkAnimPath = '/models/character_walk.glb';

// Load all three files
const baseGltf = await loader.loadAsync(baseModelPath);
const [idleGltf, walkGltf] = await Promise.all([...]);

// Use first animation from each file
const idleClip = idleGltf.animations[0];
const walkClip = walkGltf.animations[0];
```

---

## CharacterController API

### Public Properties

```typescript
public object3D: THREE.Object3D  // The character mesh/group
```

### Public Methods

```typescript
setTargetProgress(progress: number): void
// Sets target scroll progress (0-1)
// Character smoothly moves to this position

getObject(): THREE.Object3D
// Returns the character object for camera follow

isModelLoaded(): boolean
// Returns true when all files loaded successfully

update(delta: number): void
// Called every frame
// Updates position, animations, and mixer

dispose(): void
// Cleanup method
```

### Private Fields

```typescript
private startZ = 0;         // Starting Z position
private endZ = -30;         // Ending Z position
private currentProgress = 0; // Actual position (smoothed)
private targetProgress = 0;  // Target from scroll
private lastZ = 0;          // For speed calculation
private currentSpeed = 0;   // Movement speed
private modelLoaded = false; // Loading state
```

---

## Movement & Animation System

### Scroll → Progress → Movement

```
1. User scrolls
   ↓
2. ScrollController calculates progress (0-1)
   ↓
3. Calls characterController.setTargetProgress(progress)
   ↓
4. Every frame: currentProgress lerps toward targetProgress
   ↓
5. Character Z position updates
   ↓
6. Movement speed calculated
   ↓
7. Animation switches based on speed
```

### Animation Selection Logic

```typescript
private updateAnimation(): void {
  const isMoving = this.currentSpeed > this.idleThreshold; // 0.01
  
  if (isMoving && walkAction) {
    fadeToAction(walkAction);  // Switch to walk
  } else if (!isMoving && idleAction) {
    fadeToAction(idleAction);  // Switch to idle
  }
}
```

---

## File Requirements

### Base Model (`character_base.glb`)
- ✅ Must contain the character mesh/geometry
- ✅ Must have a rig/armature
- ❌ Does NOT need to contain animations
- This is the ONLY model visible in the scene

### Idle Animation (`character_idle.glb`)
- ✅ Must have same rig as base model
- ✅ Must contain at least ONE animation clip
- ✅ First animation (`animations[0]`) will be used as idle
- The mesh itself is NOT rendered

### Walk Animation (`character_walk.glb`)
- ✅ Must have same rig as base model
- ✅ Must contain at least ONE animation clip
- ✅ First animation (`animations[0]`) will be used as walk
- The mesh itself is NOT rendered

---

## Console Output

When loading successfully, you'll see:

```
Loading character base model...
✓ Base model loaded
✓ Animation files loaded
Idle animation clip: [clip name]
Walk animation clip: [clip name]
Animations setup complete
✓ Character setup complete
```

If files are missing or have issues:

```
Could not load character model or animations. Using placeholder instead.
Error: [error details]
Paths:
  Base: /models/character_base.glb
  Idle: /models/character_idle.glb
  Walk: /models/character_walk.glb
```

---

## Troubleshooting

### Issue: Character doesn't appear

**Check:**
1. Is `/models/character_base.glb` in the `public` folder?
2. Check browser console for loading errors
3. Verify file paths are correct (case-sensitive)
4. Make sure placeholder appears (green box) if model fails

### Issue: Animations don't play

**Check:**
1. Are animation files present?
2. Do animation files contain `animations` array?
3. Check console for "No idle/walk animation found" warnings
4. Verify all three files use the SAME rig

### Issue: Animations are jerky or broken

**Check:**
1. All three GLB files must share the SAME armature/rig
2. Bone names must match exactly
3. Try exporting animations with "Apply Transform" option
4. Ensure animation files exported from same source as base

---

## Customization

### Change Movement Range

```typescript
// In CharacterController
private startZ = 0;    // Start position
private endZ = -30;    // End position (change this)
```

### Change Movement Speed

```typescript
// In CharacterController
private readonly smoothSpeed = 2.0;  // Increase = faster
```

### Change Animation Threshold

```typescript
// In CharacterController
private readonly idleThreshold = 0.01;  // Adjust sensitivity
```

### Change Model Paths

```typescript
// In CharacterController
private readonly baseModelPath = '/models/YOUR_BASE.glb';
private readonly idleAnimPath = '/models/YOUR_IDLE.glb';
private readonly walkAnimPath = '/models/YOUR_WALK.glb';
```

---

## Advantages of Separate Files

✅ **Modular**: Easy to swap individual animations
✅ **Smaller Base**: Base model doesn't include animation data
✅ **Cleaner**: One animation per file, no naming confusion
✅ **Flexible**: Add more animations by loading more files
✅ **Organized**: Clear separation of concerns

---

## Future Enhancements

Possible additions with this system:

- [ ] Add run animation for fast scrolling
- [ ] Add jump animation for specific triggers
- [ ] Add turn animations for direction changes
- [ ] Load animations on-demand (lazy loading)
- [ ] Animation blending for smoother transitions
- [ ] Speed-based animation playback rate

---

## Testing

1. **Place your GLB files** in `public/models/`:
   ```
   public/
   └── models/
       ├── character_base.glb
       ├── character_idle.glb
       └── character_walk.glb
   ```

2. **Start the dev server**:
   ```bash
   npm run dev
   ```

3. **Check browser console** for loading messages

4. **Test scroll interaction**:
   - Idle animation should play when not scrolling
   - Walk animation should play when scrolling
   - Character should move smoothly along Z axis

---

## Debug Tips

Add this to see what's happening:

```typescript
// In update() method
console.log({
  progress: this.currentProgress.toFixed(2),
  speed: this.currentSpeed.toFixed(3),
  z: this.object3D.position.z.toFixed(2),
  currentAnim: this.currentAction?.getClip().name
});
```

This will show you in real-time:
- Current progress value
- Movement speed
- Z position
- Active animation name

