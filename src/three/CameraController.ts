import * as THREE from 'three';

/**
 * CameraController manages the perspective camera and its follow behavior
 */
export class CameraController {
  private camera: THREE.PerspectiveCamera;
  
  // Camera offset from target (third-person view - closer and behind)
  private offset: THREE.Vector3 = new THREE.Vector3(0, 2, 4);
  
  // Look-at offset (slightly above character center)
  private lookAtOffset: THREE.Vector3 = new THREE.Vector3(0, 1, 0);
  
  // Smooth follow parameters
  private currentPosition: THREE.Vector3 = new THREE.Vector3();
  private currentLookAt: THREE.Vector3 = new THREE.Vector3();
  private smoothFactor: number = 0.15;

  constructor() {
    // Create perspective camera with wider FOV for more immersive feel
    this.camera = new THREE.PerspectiveCamera(
      60, // fov - wider for more immersive third-person view
      window.innerWidth / window.innerHeight, // aspect
      0.1, // near
      1000 // far
    );

    // Set initial position
    this.camera.position.set(
      this.offset.x,
      this.offset.y,
      this.offset.z
    );
    
    this.currentPosition.copy(this.camera.position);
  }

  /**
   * Update camera to follow a target object
   */
  public follow(target: THREE.Object3D): void {
    // Calculate desired camera position based on target position + offset
    const desiredPosition = new THREE.Vector3(
      target.position.x + this.offset.x,
      target.position.y + this.offset.y,
      target.position.z + this.offset.z
    );

    // Smoothly interpolate camera position
    this.currentPosition.lerp(desiredPosition, this.smoothFactor);
    this.camera.position.copy(this.currentPosition);

    // Calculate look-at point (slightly above character's position)
    const lookAtTarget = new THREE.Vector3(
      target.position.x + this.lookAtOffset.x,
      target.position.y + this.lookAtOffset.y,
      target.position.z + this.lookAtOffset.z
    );

    // Smoothly interpolate look-at target
    this.currentLookAt.lerp(lookAtTarget, this.smoothFactor);
    this.camera.lookAt(this.currentLookAt);
  }

  /**
   * Handle window resize
   */
  public onResize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Get the camera instance
   */
  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  /**
   * Set camera offset for third-person view
   */
  public setOffset(x: number, y: number, z: number): void {
    this.offset.set(x, y, z);
  }

  /**
   * Set smooth follow factor (0 = no smoothing, 1 = instant)
   */
  public setSmoothFactor(factor: number): void {
    this.smoothFactor = THREE.MathUtils.clamp(factor, 0, 1);
  }
}

