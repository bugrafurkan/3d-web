import { gsap } from 'gsap';

/**
 * ScrollController converts window scroll to normalized progress (0-1)
 */
export class ScrollController {
  private progress: number = 0;
  private targetProgress: number = 0;
  private onProgressChange: (progress: number) => void;
  
  // Smooth scroll parameters
  private smoothProgress: { value: number } = { value: 0 };
  private isSmoothing: boolean = true;

  constructor(onProgressChange: (progress: number) => void) {
    this.onProgressChange = onProgressChange;

    // Bind scroll event
    window.addEventListener('scroll', this.onScroll.bind(this));

    // Initial calculation
    this.calculateProgress();
  }

  /**
   * Handle scroll events
   */
  private onScroll(): void {
    this.calculateProgress();
  }

  /**
   * Calculate normalized progress from scroll position
   */
  private calculateProgress(): void {
    const scrollHeight = document.body.scrollHeight - window.innerHeight;
    
    if (scrollHeight <= 0) {
      this.targetProgress = 0;
      return;
    }

    // Calculate raw progress (0-1)
    const rawProgress = window.scrollY / scrollHeight;
    this.targetProgress = Math.max(0, Math.min(1, rawProgress));

    // Update progress with optional smoothing
    if (this.isSmoothing) {
      this.smoothToProgress(this.targetProgress);
    } else {
      this.setProgress(this.targetProgress);
    }
  }

  /**
   * Smoothly animate to target progress using GSAP
   */
  private smoothToProgress(target: number): void {
    gsap.to(this.smoothProgress, {
      value: target,
      duration: 0.5,
      ease: 'power2.out',
      onUpdate: () => {
        this.setProgress(this.smoothProgress.value);
      }
    });
  }

  /**
   * Set progress and trigger callback
   */
  private setProgress(value: number): void {
    this.progress = value;
    this.onProgressChange(this.progress);
  }

  /**
   * Get current progress value
   */
  public getProgress(): number {
    return this.progress;
  }

  /**
   * Enable or disable smooth scrolling
   */
  public setSmoothing(enabled: boolean): void {
    this.isSmoothing = enabled;
  }

  /**
   * Manually set progress (useful for debugging or programmatic control)
   */
  public setManualProgress(progress: number): void {
    this.targetProgress = Math.max(0, Math.min(1, progress));
    this.setProgress(this.targetProgress);
  }

  /**
   * Cleanup event listeners
   */
  public dispose(): void {
    window.removeEventListener('scroll', this.onScroll.bind(this));
  }
}

