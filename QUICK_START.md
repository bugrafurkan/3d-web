# Quick Start Guide - Adding Your Character

## ✅ Prerequisites

Make sure you have:
- Node.js installed
- Three GLB files exported from Blender/Maya/etc with the **SAME rig**

---

## 📁 Step 1: Place Your Files

Copy your three GLB files to the `public/models/` directory:

```bash
public/
└── models/
    ├── character_base.glb   # Your character mesh
    ├── character_idle.glb   # Idle animation
    └── character_walk.glb   # Walk animation
```

**Important:** 
- File names must match exactly (case-sensitive)
- All three files must share the same armature/rig
- Animation files must contain at least one animation clip

---

## 🚀 Step 2: Run the Project

```bash
# Install dependencies (first time only)
npm install

# Start dev server
npm run dev
```

The app will open at **http://localhost:3000**

---

## ✨ Step 3: Test It

1. **Open the browser** - You should see your character (or green placeholder box if files missing)
2. **Check console** - Look for loading messages:
   ```
   Loading character base model...
   ✓ Base model loaded
   ✓ Animation files loaded
   Idle animation clip: [name]
   Walk animation clip: [name]
   ✓ Character setup complete
   ```
3. **Scroll the page** - Character should walk forward/backward smoothly
4. **Stop scrolling** - Character should transition to idle animation

---

## 🔧 Troubleshooting

### Character doesn't appear

**Solution:**
1. Check file paths in console error
2. Verify files are in `public/models/` (not `src/models/`)
3. Make sure files are named exactly:
   - `character_base.glb`
   - `character_idle.glb`
   - `character_walk.glb`

### Green box appears instead of character

This is the **placeholder** - it means your character files couldn't load.

**Check:**
- Files exist in `public/models/`
- File names are spelled correctly
- Console for error messages

### Character appears but doesn't animate

**Check:**
- Do animation files contain `animations` array?
- Are animation files exported from the same source as base?
- Do all three files use identical bone names?

### Animations are broken/distorted

**This means the rigs don't match!**

**Solution:**
- Re-export all three files from the same base rig
- Ensure bone names are identical across files
- Check that scale/rotation/position are applied before export

---

## 🎨 Customization

### Change Model Paths

Edit `src/three/CharacterController.ts` (lines 38-40):

```typescript
private readonly baseModelPath = '/models/character_base.glb';
private readonly idleAnimPath = '/models/character_idle.glb';
private readonly walkAnimPath = '/models/character_walk.glb';
```

### Adjust Movement Speed

Edit `src/three/CharacterController.ts` (line 27):

```typescript
private readonly smoothSpeed = 2.0;  // Increase = faster
```

### Adjust Movement Range

Edit `src/three/CharacterController.ts` (lines 21-22):

```typescript
private startZ = 0;     // Starting position
private endZ = -30;     // Ending position (change this)
```

### Change Scroll Height

Edit `src/style.css` (line 32):

```css
#scroll-content {
  height: 4000px;  /* Change total scroll distance */
}
```

---

## 📊 Expected Console Output

### Success:
```
Loading character base model...
✓ Base model loaded
✓ Animation files loaded
Idle animation clip: Idle
Walk animation clip: Walk
Animations setup complete
✓ Character setup complete
Experience started
```

### Failure:
```
Could not load character model or animations. Using placeholder instead.
Error: [details]
Paths:
  Base: /models/character_base.glb
  Idle: /models/character_idle.glb
  Walk: /models/character_walk.glb
```

---

## 📚 Further Reading

- [ANIMATION_SYSTEM.md](./ANIMATION_SYSTEM.md) - Detailed animation system docs
- [IMPROVEMENTS.md](./IMPROVEMENTS.md) - Movement and camera system
- [VISUAL_UPGRADE.md](./VISUAL_UPGRADE.md) - Visual styling changes
- [README.md](./README.md) - Full project documentation

---

## 🎯 What Happens Under the Hood

```
1. CharacterController is created
   ↓
2. Placeholder (green box) is added to scene
   ↓
3. Three files load asynchronously:
   - Base model loads
   - Idle and walk files load in parallel
   ↓
4. Base model replaces placeholder in scene
   ↓
5. AnimationMixer created on base model
   ↓
6. Animations extracted from separate files
   ↓
7. Idle animation starts playing
   ↓
8. User scrolls
   ↓
9. Character moves + switches to walk animation
   ↓
10. User stops scrolling
    ↓
11. Character slows down + switches to idle
```

---

## ✅ Checklist

Before reporting issues, verify:

- [ ] Files are in `public/models/` directory
- [ ] File names match exactly (including `.glb` extension)
- [ ] All three files use the same rig/armature
- [ ] Animation files contain animation clips
- [ ] Dev server is running (`npm run dev`)
- [ ] Browser console shows no errors
- [ ] You've refreshed the page after adding files

---

## 🆘 Still Having Issues?

1. **Check browser console** (F12 or Cmd+Option+I)
2. **Look for error messages** in the console
3. **Verify file sizes** - files should not be 0 bytes
4. **Try with placeholder first** - if green box works, it's a file issue
5. **Test files individually** - try loading just base model first

---

## 💡 Tips

- Export models at a reasonable scale (character should be ~1-2 units tall)
- Apply all transforms before exporting from 3D software
- Use "Apply Transform" option when exporting animations
- Keep file sizes reasonable (< 5MB each is good)
- Test with simple animations first before complex ones

---

## 🎉 Success!

If you see your character moving smoothly with animations, you're all set! 

Next steps:
- Fine-tune camera position
- Adjust movement speed
- Customize gradient colors
- Add more animations (run, jump, etc.)

Enjoy building your 3D scroll experience! 🚀

