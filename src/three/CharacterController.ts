import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * CharacterController manages the 3D character model, animations, and movement
 */
export class CharacterController {
  private scene: THREE.Scene;
  public object3D: THREE.Object3D;
  
  private loader: GLTFLoader;
  private mixer: THREE.AnimationMixer | null = null;
  private shadowMesh: THREE.Mesh | null = null;
  
  // Animation clips
  private idleAction: THREE.AnimationAction | null = null;
  private walkAction: THREE.AnimationAction | null = null;
  private currentAction: THREE.AnimationAction | null = null;

  // Movement parameters
  private startZ: number = 0;
  private endZ: number = -40; // tune this if the path should be longer or shorter
  private currentProgress: number = 0;
  private targetProgress: number = 0;
  private lastZ: number = 0;

  // Animation thresholds
  private readonly idleThreshold: number = 0.01; // Speed below this = idle

  // Model loading state
  private modelLoaded: boolean = false;

  // Model paths
  private readonly baseModelPath: string = '/models/character.glb';
  private readonly idleAnimPath: string = '/models/character_idle.glb';
  private readonly walkAnimPath: string = '/models/character_walk.glb';

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.loader = new GLTFLoader();

    // Create placeholder character (will be replaced when model loads)
    this.object3D = this.createPlaceholder();
    this.scene.add(this.object3D);

    // Load the actual character model and animations
    this.loadCharacterAndAnimations();
  }

  /**
   * Create a placeholder mesh (box) to represent the character
   */
  private createPlaceholder(): THREE.Object3D {
    const geometry = new THREE.BoxGeometry(0.5, 1.8, 0.5);
    const material = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      metalness: 0.3,
      roughness: 0.7,
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.y = 0.9; // Half the height to sit on ground
    
    // Add a simple shadow underneath
    this.createShadow(mesh);
    
    return mesh;
  }

  /**
   * Create a simple circular shadow under the character
   */
  private createShadow(parent: THREE.Object3D): void {
    const shadowGeometry = new THREE.CircleGeometry(0.4, 32);
    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.5,
      depthWrite: false, // Prevent z-fighting issues
    });
    
    this.shadowMesh = new THREE.Mesh(shadowGeometry, shadowMaterial);
    this.shadowMesh.rotation.x = -Math.PI / 2; // Lay flat on ground
    this.shadowMesh.position.y = -0.89; // Just under the character's feet (relative to parent)
    
    parent.add(this.shadowMesh);
  }

  /**
   * Load character base model and animation files
   */
  private async loadCharacterAndAnimations(): Promise<void> {
    try {
      console.log('Loading character base model...');
      
      // Load base model
      const baseGltf = await this.loader.loadAsync(this.baseModelPath);
      console.log('✓ Base model loaded');

      // Remove placeholder
      this.scene.remove(this.object3D);
      
      // Set up the base character model
      this.object3D = baseGltf.scene;
      this.object3D.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      
      this.scene.add(this.object3D);

      // Add shadow to the loaded model
      this.createShadow(this.object3D);

      // Try to load animation files, fallback to base model animations
      try {
        console.log('Attempting to load separate animation files...');
        const [idleGltf, walkGltf] = await Promise.all([
          this.loader.loadAsync(this.idleAnimPath),
          this.loader.loadAsync(this.walkAnimPath),
        ]);
        console.log('✓ Animation files loaded');
        this.setupAnimationsFromFiles(idleGltf, walkGltf);
      } catch (animError) {
        console.warn('Could not load separate animation files, checking base model...');
        // Fallback: use animations from base model if available
        this.setupAnimationsFromBaseModel(baseGltf);
      }
      
      this.modelLoaded = true;
      console.log('✓ Character setup complete');
      
    } catch (error) {
      console.warn('Could not load character model. Using placeholder instead.');
      console.warn('Error:', error);
      console.warn(`Base model path: ${this.baseModelPath}`);
    }
  }

  /**
   * Setup animation mixer and actions from separate animation files
   */
  private setupAnimationsFromFiles(idleGltf: any, walkGltf: any): void {
    // Create mixer on the base model
    this.mixer = new THREE.AnimationMixer(this.object3D);

    // Helper to retarget animation clips to match base model's bone names
    const retargetClip = (clip: THREE.AnimationClip) => {
      // 1. Collect all bone names from the base model
      const modelBoneNames: string[] = [];
      this.object3D.traverse((child) => {
        if (child instanceof THREE.Bone) {
          modelBoneNames.push(child.name);
        }
      });

      console.log(`Retargeting "${clip.name}". Model has ${modelBoneNames.length} bones.`);

      // 2. Map each track to the correct bone name
      clip.tracks.forEach((track) => {
        // Track name format: "BoneName.property" (e.g., "mixamorig:Hips.position")
        const trackBoneName = track.name.split('.')[0];
        const property = track.name.split('.').slice(1).join('.');

        // Perfect match?
        if (modelBoneNames.includes(trackBoneName)) {
          return; // All good
        }

        // Try to find a match
        // Strategy A: Remove prefix from track name and check (Animation has prefix, Model doesn't)
        const trackNameNoPrefix = trackBoneName.split(':').pop() || trackBoneName;
        
        // Strategy B: Find a bone in model that ends with the track name (Model has prefix, Animation doesn't)
        const match = modelBoneNames.find(
          (modelName) => 
            modelName === trackNameNoPrefix || 
            modelName.endsWith(':' + trackNameNoPrefix) ||
            trackNameNoPrefix.endsWith(':' + modelName)
        );

        if (match) {
          // console.log(`Retargeting: ${trackBoneName} -> ${match}`);
          track.name = `${match}.${property}`;
        } else {
          // console.warn(`Could not find matching bone for track: ${trackBoneName}`);
        }
      });
      
      return clip;
    };

    // Extract idle animation
    if (idleGltf.animations && idleGltf.animations.length > 0) {
      const idleClip = retargetClip(idleGltf.animations[0]);
      console.log('Idle animation clip:', idleClip.name);
      
      this.idleAction = this.mixer.clipAction(idleClip);
      this.idleAction.play();
      this.currentAction = this.idleAction;
    } else {
      console.warn('No idle animation found in idle GLB file');
    }

    // Extract walk animation
    if (walkGltf.animations && walkGltf.animations.length > 0) {
      const walkClip = retargetClip(walkGltf.animations[0]);
      console.log('Walk animation clip:', walkClip.name);
      
      this.walkAction = this.mixer.clipAction(walkClip);
    } else {
      console.warn('No walk animation found in walk GLB file');
    }

    console.log('Animations setup complete');
  }

  /**
   * Fallback: Setup animations from base model if separate files fail
   */
  private setupAnimationsFromBaseModel(baseGltf: any): void {
    if (!baseGltf.animations || baseGltf.animations.length === 0) {
      console.warn('⚠ No animations found in base model either');
      return;
    }

    console.log('Using animations from base model');
    console.log('Available animations:', baseGltf.animations.map((clip: THREE.AnimationClip) => clip.name));

    // Create mixer on the base model
    this.mixer = new THREE.AnimationMixer(this.object3D);

    // Find idle animation (fuzzy match)
    const idleClip = baseGltf.animations.find(
      (clip: THREE.AnimationClip) => clip.name.toLowerCase().includes('idle')
    );
    if (idleClip) {
      console.log('✓ Found idle animation:', idleClip.name);
      this.idleAction = this.mixer.clipAction(idleClip);
      this.idleAction.play();
      this.currentAction = this.idleAction;
    }

    // Find walk animation (fuzzy match)
    const walkClip = baseGltf.animations.find(
      (clip: THREE.AnimationClip) => clip.name.toLowerCase().includes('walk')
    );
    if (walkClip) {
      console.log('✓ Found walk animation:', walkClip.name);
      this.walkAction = this.mixer.clipAction(walkClip);
    }

    if (!idleClip && !walkClip) {
      console.warn('⚠ Could not find idle or walk animations in base model');
      console.warn('Available animation names:', baseGltf.animations.map((c: any) => c.name));
    }

    console.log('Animations setup complete (from base model)');
  }

  /**
   * Set target progress from scroll (0 = start, 1 = end)
   */
  public setTargetProgress(progress: number): void {
    this.targetProgress = THREE.MathUtils.clamp(progress, 0, 1);
  }

  /**
   * Map progress to Z position
   */
  private getZFromProgress(p: number): number {
    const clamped = THREE.MathUtils.clamp(p, 0, 1);
    return THREE.MathUtils.lerp(this.startZ, this.endZ, clamped);
  }

  /**
   * Play idle animation with smooth transition
   */
  private playIdle(): void {
    if (!this.idleAction || this.currentAction === this.idleAction) return;

    this.idleAction.enabled = true;
    this.idleAction.reset();
    this.idleAction.fadeIn(0.2);

    if (this.currentAction) {
      this.currentAction.fadeOut(0.2);
    }

    this.idleAction.play();
    this.currentAction = this.idleAction;
  }

  /**
   * Play walk animation with smooth transition
   */
  private playWalk(): void {
    if (!this.walkAction || this.currentAction === this.walkAction) return;

    this.walkAction.enabled = true;
    this.walkAction.reset();
    this.walkAction.fadeIn(0.2);

    if (this.currentAction) {
      this.currentAction.fadeOut(0.2);
    }

    this.walkAction.play();
    this.currentAction = this.walkAction;
  }

  /**
   * Update animation mixer and character movement (call every frame)
   */
  public update(delta: number): void {
    if (!this.mixer) return;

    // Smoothly move currentProgress toward targetProgress
    const smoothSpeed = 5; // responsiveness, tweak if needed
    const t = 1 - Math.exp(-smoothSpeed * delta);

    this.currentProgress = THREE.MathUtils.lerp(
      this.currentProgress,
      this.targetProgress,
      t
    );

    // Map progress to Z position
    const newZ = this.getZFromProgress(this.currentProgress);
    const deltaZ = newZ - this.lastZ;
    this.object3D.position.z = newZ;

    // Approximate speed along Z (units per second)
    const speed = Math.abs(deltaZ) / Math.max(delta, 1e-5);
    this.lastZ = newZ;

    // Decide between idle vs walk based on speed
    const WALK_THRESHOLD = 0.02; // tweak if character looks too "jittery"

    if (this.idleAction && this.walkAction) {
      if (speed > WALK_THRESHOLD) {
        this.playWalk();
      } else {
        this.playIdle();
      }
    }

    // Advance animations
    this.mixer.update(delta);
  }

  /**
   * Get the character object for camera follow
   */
  public getObject(): THREE.Object3D {
    return this.object3D;
  }

  /**
   * Check if the model has been loaded
   */
  public isModelLoaded(): boolean {
    return this.modelLoaded;
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    if (this.mixer) {
      this.mixer.stopAllAction();
    }

    this.scene.remove(this.object3D);
    
    // Dispose shadow
    if (this.shadowMesh) {
      this.shadowMesh.geometry.dispose();
      if (this.shadowMesh.material instanceof THREE.Material) {
        this.shadowMesh.material.dispose();
      }
    }
    
    // Dispose geometries and materials
    this.object3D.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(material => material.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}

