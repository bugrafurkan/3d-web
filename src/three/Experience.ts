import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CameraController } from './CameraController';
import { CharacterController } from './CharacterController';
import { ScrollController } from './ScrollController';
import { UiController, UiSceneConfig } from './UiController';
import { FinalChoiceController } from './FinalChoiceController';

type SceneId = 'intro' | 'lifStreet' | 'yilSonu' | 'gidis' | 'final';

interface SceneDefinition {
  id: SceneId;
  ui: UiSceneConfig;
}

const SCENES: SceneDefinition[] = [
  {
    id: 'intro',
    ui: {
      title: 'Giriş',
      texts: [
        'Bu sahne giriş sahnesi.',
        'Scroll ile hem karakter ilerleyecek, hem bu metinler açılacak.',
        'Her satır, ilerledikçe görünür hale gelecek.',
        'Sahnenin sonunda bir sonraki sahneye geçmek için buton göreceksin.',
        'Bu metinleri daha sonra gerçek içerikle değiştirebilirsin.'
      ],
      nextSceneTitle: 'Sonraki sahne: Lif Sokak'
    }
  },
  {
    id: 'lifStreet',
    ui: {
      title: 'Lif Sokak',
      texts: [
        'Lif Sokak sahnesine hoş geldin.',
        'Sağ tarafta metinler, ortada karakterin yürüyüşü devam edecek.',
        'Bu sahnede daha sonra tribün ve güneş gibi 3D objeler de görünecek.',
        'Scroll ile ilerledikçe tüm satırlar tamamlanacak.',
        'Bu metinleri de ileride gerçek hikaye / açıklama ile değiştireceksin.'
      ],
      nextSceneTitle: 'Sonraki sahne: Yıl Sonu'
    }
  },
  {
    id: 'yilSonu',
    ui: {
      title: 'Yıl Sonu',
      texts: [
        'Yeni bir yılın eşiği...',
        'Geride kalanların değerlendirilmesi...',
        'Dönüşümün başlangıcı...',
        'Yol devam ediyor...'
      ],
      nextSceneTitle: 'Sonraki sahne: Gidiş'
    }
  },
  {
    id: 'gidis',
    ui: {
      title: 'Gidiş',
      texts: [
        'Yolun sonuna yaklaşırken...',
        'Işık artık zayıf...',
        'Sessizlik ağırlaşıyor...',
        'Ama adımlar devam ediyor...'
      ],
      nextSceneTitle: 'Son Durak'
    }
  },
  {
    id: 'final',
    ui: {
      title: '',
      texts: []
    }
  }
];

/**
 * Main Experience class that orchestrates the entire 3D scene
 */
export class Experience {
  private canvas: HTMLCanvasElement;
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private cameraController: CameraController;
  private characterController: CharacterController;
  private scrollController: ScrollController;
  private uiController: UiController;
  private finalChoiceController: FinalChoiceController;
  
  private clock: THREE.Clock;
  private isRunning: boolean = false;

  // Scene state
  private currentSceneIndex: number = 0;
  private sceneProgress: number = 0;

  // Loader for environment GLBs (Lif Sokak scene)
  private envLoader: GLTFLoader = new GLTFLoader();

  // Lif Sokak specific objects
  private lifTribune: THREE.Object3D | null = null;
  private lifSun: THREE.Object3D | null = null;
  private lifSunLight: THREE.DirectionalLight | null = null;
  private lifSunPointLight: THREE.PointLight | null = null; // Extra light from the sun

  // Yıl Sonu specific objects
  private yilSonuIsland: THREE.Object3D | null = null;
  private islandLoader: GLTFLoader = new GLTFLoader();

  // Gidiş specific objects (dim/dying sun)
  private gidisSun: THREE.Object3D | null = null;
  private gidisSunLight: THREE.DirectionalLight | null = null;
  private gidisLoader: GLTFLoader = new GLTFLoader();

  // Gidiş atmosphere effects
  private gidisAmbientLight: THREE.AmbientLight | null = null;

  // Rain system for gidis
  private gidisRainGeometry: THREE.BufferGeometry | null = null;
  private gidisRainMaterial: THREE.PointsMaterial | null = null;
  private gidisRainPoints: THREE.Points | null = null;

  // Lightning system for gidis
  private gidisLightningLight: THREE.DirectionalLight | null = null;
  private gidisLightningTimer: number = 0;
  private gidisLightningCooldown: number = 0;
  private gidisLightningDuration: number = 0.15; // total flash duration in seconds

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();

    // Initialize scene (no background - will be transparent)
    this.scene = new THREE.Scene();

    // Initialize renderer with alpha for transparent background
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setClearColor(0x000000, 0); // Transparent clear color
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Setup lighting
    this.setupLighting();

    // Initialize camera controller
    this.cameraController = new CameraController();

    // Initialize character controller (no ground needed - character walks in space)
    this.characterController = new CharacterController(this.scene);

    // Initialize UIController with a callback to go to next scene
    this.uiController = new UiController(() => {
      this.goToNextScene();
    });

    // Initialize FinalChoiceController
    this.finalChoiceController = new FinalChoiceController();

    // Set initial scene
    this.applyCurrentScene();

    // ScrollController: forward progress to both character and UI
    this.scrollController = new ScrollController((progress: number) => {
      const sceneDef = SCENES[this.currentSceneIndex];

      // In final scene, ignore scroll completely
      if (sceneDef.id === 'final') {
        return;
      }

      this.sceneProgress = Math.min(1, Math.max(0, progress));
      this.characterController.setTargetProgress(this.sceneProgress);
      this.uiController.updateProgress(this.sceneProgress);
    });

    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  /**
   * Setup scene lighting
   */
  private setupLighting(): void {
    // Ambient light for general illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Directional light for shadows and definition
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    
    // Configure shadow properties
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    
    this.scene.add(directionalLight);
  }

  /**
   * Handle window resize events
   */
  private onWindowResize(): void {
    // Update renderer
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Update camera
    this.cameraController.onResize(window.innerWidth, window.innerHeight);
  }

  // Main animation loop
  private update = (): void => {
    if (!this.isRunning) return;
    
    requestAnimationFrame(this.update);

    const delta = this.clock.getDelta();

    this.characterController.update(delta);

    // Per-scene effect updates
    const sceneDef = SCENES[this.currentSceneIndex];
    if (sceneDef.id === 'gidis') {
      this.updateGidisEffects(delta);
    }

    this.updateCameraFollow();

    this.renderer.render(this.scene, this.cameraController.getCamera());
  };

  /**
   * Simple third-person camera follow helper
   */
  private updateCameraFollow(): void {
    const target = this.characterController.object3D;

    // Desired offset behind and above the character
    const offset = new THREE.Vector3(0, 1.7, 4);
    const desiredPos = target.position.clone().add(offset);

    const followLerp = 0.1; // camera smoothing factor
    this.cameraController.getCamera().position.lerp(desiredPos, followLerp);

    const lookAtTarget = target.position.clone().add(new THREE.Vector3(0, 1.5, 0));
    this.cameraController.getCamera().lookAt(lookAtTarget);
  }

  /**
   * Setup Lif Sokak environment (tribune, sun, and sun light)
   */
  private async setupLifStreetEnvironment(): Promise<void> {
    // Avoid re-loading if already created
    if (this.lifTribune || this.lifSun || this.lifSunLight) {
      return;
    }

    try {
      console.log('Loading Lif Sokak environment...');

      // 1) Load stadium (tribune)
      const tribuneGltf = await this.envLoader.loadAsync(
        '/models/lif_street/stadium.glb'
      );

      this.lifTribune = tribuneGltf.scene;
      this.lifTribune.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      });

      // Place tribune roughly on the right side of the path
      // Adjust as needed once you see it in the scene
      this.lifTribune.position.set(4, 0, -15);
      this.scene.add(this.lifTribune);
      console.log('✓ Tribune loaded and positioned');

      // Compute bounding box to position the sun above/back of the tribune
      const tribuneBox = new THREE.Box3().setFromObject(this.lifTribune);
      const tribuneSize = new THREE.Vector3();
      const tribuneCenter = new THREE.Vector3();
      tribuneBox.getSize(tribuneSize);
      tribuneBox.getCenter(tribuneCenter);

      // 2) Load sun object
      const sunGltf = await this.envLoader.loadAsync(
        '/models/lif_street/sun.glb'
      );

      this.lifSun = sunGltf.scene;
      this.lifSun.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = false;
          mesh.receiveShadow = false;

          // Make the sun emit light (glowing effect)
          if (mesh.material) {
            const material = mesh.material as THREE.MeshStandardMaterial;
            material.emissive = new THREE.Color(0xfff2b0); // Warm yellow glow
            material.emissiveIntensity = 0.8;
          }
        }
      });

      // Place sun above and slightly behind the tribune
      const sunPosition = new THREE.Vector3(
        tribuneCenter.x,
        tribuneBox.max.y + tribuneSize.y * 0.5 + 2,
        tribuneBox.min.z - tribuneSize.z * 0.5 - 2
      );
      this.lifSun.position.copy(sunPosition);
      this.scene.add(this.lifSun);
      console.log('✓ Sun loaded and positioned');

      // Add a point light at the sun's center to emit extra light
      this.lifSunPointLight = new THREE.PointLight(0xfff2b0, 2.5, 50, 2);
      this.lifSunPointLight.position.copy(sunPosition);
      this.lifSunPointLight.castShadow = false; // Directional light already handles shadows
      this.scene.add(this.lifSunPointLight);
      console.log('✓ Sun point light created (radiating from sun)');

      // 3) Directional light coming from the sun
      this.lifSunLight = new THREE.DirectionalLight(0xfff2b0, 1.7);
      // Place the light slightly offset from the sun so the direction is visible
      this.lifSunLight.position.copy(
        sunPosition.clone().add(new THREE.Vector3(-4, 3, 2))
      );

      // Make the light point roughly towards the area where the character walks
      const lightTarget = new THREE.Object3D();
      lightTarget.position.set(0, 0, -10);
      this.scene.add(lightTarget);

      this.lifSunLight.target = lightTarget;
      this.lifSunLight.castShadow = true;
      this.lifSunLight.shadow.mapSize.set(1024, 1024);
      this.lifSunLight.shadow.camera.near = 1;
      this.lifSunLight.shadow.camera.far = 50;

      this.scene.add(this.lifSunLight);
      console.log('✓ Sun light created');
      console.log('✓ Lif Sokak environment setup complete');

    } catch (error) {
      console.error('Error setting up Lif Sokak environment:', error);
    }
  }

  /**
   * Cleanup Lif Sokak environment
   */
  private cleanupLifStreetEnvironment(): void {
    if (this.lifTribune) {
      this.scene.remove(this.lifTribune);
      this.lifTribune = null;
      console.log('✓ Tribune removed');
    }

    if (this.lifSun) {
      this.scene.remove(this.lifSun);
      this.lifSun = null;
      console.log('✓ Sun removed');
    }

    if (this.lifSunPointLight) {
      this.scene.remove(this.lifSunPointLight);
      this.lifSunPointLight = null;
      console.log('✓ Sun point light removed');
    }

    if (this.lifSunLight) {
      // Light target should also be cleaned up if it's in the scene
      const target = this.lifSunLight.target;
      this.scene.remove(this.lifSunLight);
      if (target) {
        this.scene.remove(target);
      }
      this.lifSunLight = null;
      console.log('✓ Sun directional light removed');
    }
  }

  /**
   * Setup Yıl Sonu environment (island model)
   */
  private async setupYilSonuEnvironment(): Promise<void> {
    if (this.yilSonuIsland) return;

    try {
      console.log('Loading Yıl Sonu environment...');
      
      const gltf = await this.islandLoader.loadAsync('/models/yilsonu/island.glb');

      this.yilSonuIsland = gltf.scene;
      this.yilSonuIsland.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      });

      // Position island on the left side of the walking path
      this.yilSonuIsland.position.set(-5, -1, -12);
      this.yilSonuIsland.scale.set(1.6, 1.6, 1.6);

      this.scene.add(this.yilSonuIsland);
      console.log('✓ Yıl Sonu island loaded and positioned');
      
    } catch (err) {
      console.error('Failed to load YılSonu island:', err);
    }
  }

  /**
   * Cleanup Yıl Sonu environment
   */
  private cleanupYilSonuEnvironment(): void {
    if (this.yilSonuIsland) {
      this.scene.remove(this.yilSonuIsland);
      this.yilSonuIsland = null;
      console.log('✓ Yıl Sonu island removed');
    }
  }

  /**
   * Setup Gidiş environment (dim/dying sun, rain, lightning)
   */
  private async setupGidisEnvironment(): Promise<void> {
    // Avoid re-creating if already active
    if (this.gidisSun && this.gidisRainPoints && this.gidisLightningLight) {
      return;
    }

    try {
      console.log('Loading Gidiş environment...');
      
      // 1) Load dim sun (reuse the same sun.glb but with minimal lighting)
      if (!this.gidisSun) {
        const gltf = await this.gidisLoader.loadAsync('/models/lif_street/sun.glb');
        this.gidisSun = gltf.scene;

        this.gidisSun.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = false;
            mesh.receiveShadow = false;

            // Make the sun barely visible (dying/ghost sun)
            if (mesh.material) {
              const material = mesh.material as THREE.MeshStandardMaterial;
              material.emissive = new THREE.Color(0x000000);
              material.emissiveIntensity = 0.005; // Almost invisible
              material.opacity = 0.3; // Semi-transparent
              material.transparent = true;
            }
          }
        });

        // Position sun on the left side in the very far distance
        this.gidisSun.position.set(-6, 3.5, -25);
        this.gidisSun.scale.set(1.0, 1.0, 1.0);

        this.scene.add(this.gidisSun);
        console.log('✓ Dim sun loaded and positioned (left side)');
      }

      // 2) Add extremely faint directional light (ghost light)
      if (!this.gidisSunLight) {
        this.gidisSunLight = new THREE.DirectionalLight(0xffdcb0, 0.08); // Even weaker
        this.gidisSunLight.position.set(-6, 4, -20);

        const target = new THREE.Object3D();
        target.position.set(0, 0, -10);
        this.scene.add(target);

        this.gidisSunLight.target = target;
        this.scene.add(this.gidisSunLight);
        console.log('✓ Faint directional light created (dying sun)');
      }

      // 3) Add a dark ambient light to make the scene overall dim
      if (!this.gidisAmbientLight) {
        this.gidisAmbientLight = new THREE.AmbientLight(0x202430, 0.18);
        this.scene.add(this.gidisAmbientLight);
        
        // Set darker scene background
        this.scene.background = new THREE.Color(0x151820);
        
        console.log('✓ Dark ambient light added');
      }

      // 4) Create rain particles above the path
      if (!this.gidisRainPoints) {
        const rainCount = 1800;
        const positions = new Float32Array(rainCount * 3);

        // Distribute rain roughly above the walking area
        for (let i = 0; i < rainCount; i++) {
          const i3 = i * 3;
          positions[i3 + 0] = (Math.random() - 0.5) * 10;  // x: -5..5
          positions[i3 + 1] = 3 + Math.random() * 8;       // y: 3..11
          positions[i3 + 2] = -25 + Math.random() * 30;    // z: -25..5
        }

        this.gidisRainGeometry = new THREE.BufferGeometry();
        this.gidisRainGeometry.setAttribute(
          'position',
          new THREE.BufferAttribute(positions, 3)
        );

        this.gidisRainMaterial = new THREE.PointsMaterial({
          color: 0x88a0ff,
          size: 0.06,
          transparent: true,
          opacity: 0.8,
          depthWrite: false
        });

        this.gidisRainPoints = new THREE.Points(
          this.gidisRainGeometry,
          this.gidisRainMaterial
        );
        this.scene.add(this.gidisRainPoints);
        console.log('✓ Rain particles created (1800 drops)');
      }

      // 5) Create a lightning light for brief flashes
      if (!this.gidisLightningLight) {
        this.gidisLightningLight = new THREE.DirectionalLight(0xffffff, 0);
        // Place lightning somewhere above and in front of the scene
        this.gidisLightningLight.position.set(-5, 10, -15);

        const lightningTarget = new THREE.Object3D();
        lightningTarget.position.set(0, 0, -10);
        this.scene.add(lightningTarget);

        this.gidisLightningLight.target = lightningTarget;
        this.scene.add(this.gidisLightningLight);

        // Reset timers
        this.gidisLightningTimer = 0;
        this.gidisLightningCooldown = 2 + Math.random() * 4; // 2-6 seconds (more frequent)
        console.log('✓ Lightning system initialized');
      }

      console.log('✓ Gidiş environment setup complete (dark, rainy atmosphere)');

    } catch (err) {
      console.error('Failed to load Gidis sun:', err);
    }
  }

  /**
   * Cleanup Gidiş environment (remove all atmosphere effects)
   */
  private cleanupGidisEnvironment(): void {
    // Remove dim sun
    if (this.gidisSun) {
      this.scene.remove(this.gidisSun);
      this.gidisSun = null;
      console.log('✓ Dim sun removed');
    }

    // Remove dim sun directional light and its target
    if (this.gidisSunLight) {
      const target = this.gidisSunLight.target;
      this.scene.remove(this.gidisSunLight);
      if (target) {
        this.scene.remove(target);
      }
      this.gidisSunLight = null;
      console.log('✓ Faint directional light removed');
    }

    // Remove ambient light and reset scene background
    if (this.gidisAmbientLight) {
      this.scene.remove(this.gidisAmbientLight);
      this.gidisAmbientLight = null;
      
      // Reset scene background to null (transparent)
      this.scene.background = null;
      
      console.log('✓ Dark ambient light removed');
    }

    // Remove rain
    if (this.gidisRainPoints) {
      this.scene.remove(this.gidisRainPoints);
      this.gidisRainPoints = null;
      console.log('✓ Rain particles removed');
    }
    if (this.gidisRainGeometry) {
      this.gidisRainGeometry.dispose();
      this.gidisRainGeometry = null;
    }
    if (this.gidisRainMaterial) {
      this.gidisRainMaterial.dispose();
      this.gidisRainMaterial = null;
    }

    // Remove lightning light and its target
    if (this.gidisLightningLight) {
      const target = this.gidisLightningLight.target;
      this.scene.remove(this.gidisLightningLight);
      if (target) {
        this.scene.remove(target);
      }
      this.gidisLightningLight = null;
      console.log('✓ Lightning system removed');
    }

    // Reset timers
    this.gidisLightningTimer = 0;
    this.gidisLightningCooldown = 0;
  }

  /**
   * Update Gidiş scene effects (rain fall + lightning flashes)
   */
  private updateGidisEffects(delta: number): void {
    // 1) Rain fall animation
    if (this.gidisRainGeometry && this.gidisRainPoints) {
      const attr = this.gidisRainGeometry.getAttribute('position');
      const positions = attr.array as Float32Array;
      const count = positions.length / 3;
      const rainSpeed = 9; // units per second

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        // y index is i3 + 1
        positions[i3 + 1] -= rainSpeed * delta;

        // Reset drop to top if it falls below ground
        if (positions[i3 + 1] < 0) {
          positions[i3 + 1] = 8 + Math.random() * 4; // 8..12
          positions[i3 + 0] = (Math.random() - 0.5) * 10; // x
          positions[i3 + 2] = -25 + Math.random() * 30;   // z
        }
      }

      attr.needsUpdate = true;
    }

    // 2) Lightning timing and flashes
    if (this.gidisLightningLight) {
      if (this.gidisLightningTimer > 0) {
        // Lightning is currently active
        this.gidisLightningTimer -= delta;
        const t = Math.max(0, this.gidisLightningTimer / this.gidisLightningDuration);
        // Quick flicker: intensity fades out non-linearly - POWERFUL flash
        this.gidisLightningLight.intensity = 6.5 * (t * t);

        if (this.gidisLightningTimer <= 0) {
          this.gidisLightningLight.intensity = 0;
        }
      } else {
        // Waiting for next lightning
        this.gidisLightningCooldown -= delta;
        if (this.gidisLightningCooldown <= 0) {
          // Trigger a new flash
          this.gidisLightningDuration = 0.08 + Math.random() * 0.12; // 0.08 - 0.2s
          this.gidisLightningTimer = this.gidisLightningDuration;
          const nextCooldown = 2 + Math.random() * 4;
          this.gidisLightningCooldown = nextCooldown;

          // Place lightning based on camera position for guaranteed visibility
          const cam = this.cameraController.getCamera();
          const x = cam.position.x + (Math.random() - 0.5) * 4;   // slight horizontal variation
          const y = cam.position.y + 6 + Math.random() * 3;       // above the camera
          const z = cam.position.z - 10 + (Math.random() - 0.5) * 3;  // in front of camera

          this.gidisLightningLight.position.set(x, y, z);

          // Log lightning strike
          console.log(`⚡ ŞIMŞEK! Position: (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}) | Next in ${nextCooldown.toFixed(1)}s`);
        }
      }
    }
  }

  /**
   * Setup scene-specific environment based on scene ID
   */
  private setupSceneEnvironment(sceneIndex: number): void {
    const sceneDef = SCENES[sceneIndex];

    switch (sceneDef.id) {
      case 'lifStreet':
        // Fire and forget; environment can load async
        this.setupLifStreetEnvironment();
        break;
      case 'yilSonu':
        this.setupYilSonuEnvironment();
        break;
      case 'gidis':
        this.setupGidisEnvironment();
        break;
      case 'intro':
      case 'final':
      default:
        // No special environment for intro or final
        break;
    }
  }

  /**
   * Cleanup scene-specific environment based on scene ID
   */
  private cleanupSceneEnvironment(sceneIndex: number): void {
    const sceneDef = SCENES[sceneIndex];

    switch (sceneDef.id) {
      case 'lifStreet':
        this.cleanupLifStreetEnvironment();
        break;
      case 'yilSonu':
        this.cleanupYilSonuEnvironment();
        break;
      case 'gidis':
        this.cleanupGidisEnvironment();
        break;
      case 'intro':
      default:
        // Nothing to clean for intro at this point
        break;
    }
  }

  /**
   * Apply the current scene configuration
   */
  private applyCurrentScene(): void {
    const sceneDef = SCENES[this.currentSceneIndex];
    const ui = sceneDef.ui;

    console.log(`Applying scene: ${sceneDef.id}`);

    // Before switching, clean up all scene-specific environments
    // This ensures we start fresh with the new scene
    for (let i = 0; i < SCENES.length; i++) {
      this.cleanupSceneEnvironment(i);
    }

    // Reset scene progress
    this.sceneProgress = 0;

    // Scroll to top so ScrollController starts from 0
    window.scrollTo(0, 0);

    // Immediately reset character position to the start of the path
    this.characterController.setTargetProgress(0);

    // Handle UI + final overlay
    const isFinal = sceneDef.id === 'final';

    if (isFinal) {
      // Hide panel texts; final screen uses its own overlay
      this.uiController.setScene(ui);
      this.uiController.setPanelVisible(false);

      // Hide character in final scene
      this.characterController.object3D.visible = false;

      // Show final choice overlay
      this.finalChoiceController.show();
    } else {
      // Normal scenes: show right panel, hide final overlay
      this.finalChoiceController.hide();
      this.characterController.object3D.visible = true;
      this.uiController.setScene(ui);
      this.uiController.setPanelVisible(true);
      this.uiController.updateProgress(0);
    }

    // After basic setup, initialize environment for the new scene
    this.setupSceneEnvironment(this.currentSceneIndex);
  }

  /**
   * Go to the next scene
   */
  private goToNextScene(): void {
    if (this.currentSceneIndex >= SCENES.length - 1) {
      // No next scene yet; in the future we will add more
      console.log('No more scenes available');
      return;
    }

    this.currentSceneIndex++;
    this.applyCurrentScene();
  }

  /**
   * Start the experience
   */
  public start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.clock.start();
    this.update();
    
    console.log('Experience started');
  }

  /**
   * Stop the experience
   */
  public stop(): void {
    this.isRunning = false;
    this.clock.stop();
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    this.stop();
    this.scrollController.dispose();
    this.characterController.dispose();
    this.renderer.dispose();
    window.removeEventListener('resize', this.onWindowResize.bind(this));
  }
}

