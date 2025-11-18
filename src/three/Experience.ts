import * as THREE from 'three';
import { CameraController } from './CameraController';
import { CharacterController } from './CharacterController';
import { ScrollController } from './ScrollController';

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
  
  private clock: THREE.Clock;
  private isRunning: boolean = false;

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

    // Initialize scroll controller
    this.scrollController = new ScrollController((progress: number) => {
      this.characterController.setTargetProgress(progress);
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

  /**
   * Main animation loop
   */
  private update(): void {
    if (!this.isRunning) return;

    const delta = this.clock.getDelta();

    // Update character controller (animation mixer)
    this.characterController.update(delta);

    // Update camera to follow character
    this.cameraController.follow(this.characterController.getObject());

    // Render the scene
    this.renderer.render(this.scene, this.cameraController.getCamera());

    // Continue the loop
    requestAnimationFrame(() => this.update());
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

