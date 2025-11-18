import './style.css';
import { Experience } from './three/Experience';

/**
 * Initialize the 3D experience
 */
function init() {
  const canvas = document.querySelector<HTMLCanvasElement>('#webgl');
  
  if (!canvas) {
    throw new Error('Canvas element not found');
  }

  // Create and start the experience
  const experience = new Experience(canvas);
  experience.start();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

