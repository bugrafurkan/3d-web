import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CameraController } from './CameraController';
import { CharacterController } from './CharacterController';
import { ScrollController } from './ScrollController';
import { UiController, UiSceneConfig } from './UiController';

type SceneId = 'intro' | 'lifStreet';

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
      // Bu sahneden sonra ek sahneler geldiğinde burayı da güncelleyeceğiz.
      nextSceneTitle: undefined
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

    // Set initial scene
    this.applyCurrentScene();

    // ScrollController: forward progress to both character and UI
    this.scrollController = new ScrollController((progress: number) => {
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
   * Setup scene-specific environment based on scene ID
   */
  private setupSceneEnvironment(sceneIndex: number): void {
    const sceneDef = SCENES[sceneIndex];

    switch (sceneDef.id) {
      case 'lifStreet':
        // Fire and forget; environment can load async
        this.setupLifStreetEnvironment();
        break;
      case 'intro':
      default:
        // No special environment for intro at this step
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

    // Update UI
    this.uiController.setScene(ui);
    this.uiController.updateProgress(0);

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

