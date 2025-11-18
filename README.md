# 3D Character Scroll Experience

A scroll-based 3D character landing page built with Three.js, TypeScript, and Vite.

## Features

- 🎮 Scroll-controlled 3D character movement
- 🎬 Character animation system (idle & walk states)
- 📹 Smooth third-person camera follow
- 🎨 Modern Three.js setup with TypeScript
- ⚡ Fast development with Vite

## Tech Stack

- **Vite** - Fast build tool and dev server
- **TypeScript** - Type-safe development
- **Three.js** - 3D graphics library
- **GSAP** - Smooth scroll animations

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will open at http://localhost:3000

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── main.ts                    # Entry point
├── style.css                  # Global styles
└── three/
    ├── Experience.ts          # Main scene orchestrator
    ├── CameraController.ts    # Camera management & follow behavior
    ├── CharacterController.ts # Character loading & animation
    ├── ScrollController.ts    # Scroll-to-progress conversion
    └── Ground.ts              # Ground plane/corridor
```

## Adding Your Character Model

This project uses **three separate GLB files**:

1. **Base Model**: `public/models/character_base.glb` (the rendered character)
2. **Idle Animation**: `public/models/character_idle.glb` (contains idle animation)
3. **Walk Animation**: `public/models/character_walk.glb` (contains walk animation)

### File Structure

```
public/
└── models/
    ├── character_base.glb  ← Main character mesh (REQUIRED)
    ├── character_idle.glb  ← Idle animation (REQUIRED)
    └── character_walk.glb  ← Walk animation (REQUIRED)
```

### Requirements

- All three files must use the **SAME rig/armature**
- Animation files must contain at least one animation clip
- The first animation (`animations[0]`) from each file will be used

### The System Will:

- ✅ Load base model and add to scene
- ✅ Load animation files and extract clips
- ✅ Apply animations to base model's mixer
- ✅ Play idle by default
- ✅ Switch to walk when scrolling
- ✅ Handle smooth animation blending

See [ANIMATION_SYSTEM.md](./ANIMATION_SYSTEM.md) for detailed documentation.

## How It Works

### Scroll System

- The page has a scroll area of 4000px (configurable in `style.css`)
- As you scroll, progress goes from 0 (top) to 1 (bottom)
- This progress drives the character's Z position from 0 to -50

### Character Movement

- Character moves along a straight path (Z axis)
- Position is interpolated based on scroll progress
- Camera follows with smooth damping

### Animation States

- **Idle**: When at rest (progress near 0 or 1)
- **Walk**: When actively scrolling
- Smooth transitions between states using `fadeIn`/`fadeOut`

## Customization

### Camera Settings

Edit `src/three/CameraController.ts`:

```typescript
// Change camera offset (x, y, z)
private offset: THREE.Vector3 = new THREE.Vector3(0, 3, 8);

// Adjust smoothing (0-1, higher = faster)
private smoothFactor: number = 0.1;
```

### Path Length

Edit `src/three/CharacterController.ts`:

```typescript
private readonly pathStart: number = 0;
private readonly pathEnd: number = -50; // Adjust end position
```

### Scroll Height

Edit `src/style.css`:

```css
#scroll-content {
  height: 4000px; /* Adjust total scroll distance */
}
```

## Documentation

- [IMPROVEMENTS.md](./IMPROVEMENTS.md) - Movement and camera improvements
- [VISUAL_UPGRADE.md](./VISUAL_UPGRADE.md) - Gradient background changes
- [ANIMATION_SYSTEM.md](./ANIMATION_SYSTEM.md) - Detailed animation system docs

## Next Steps

- [ ] Add your character models (base + animations)
- [ ] Implement multiple scenes/chapters
- [ ] Add doors/portals for scene transitions
- [ ] Add UI overlay with chapter titles
- [ ] Implement camera angle changes per chapter
- [ ] Add ambient sounds and music
- [ ] Optimize performance and loading

## License

MIT

