import { gsap } from 'gsap';

/**
 * ScrollController converts window scroll to normalized progress (0-1)
 */
export class ScrollController {
  private maxScroll: number;
  private callback: (progress: number) => void;

  constructor(callback: (progress: number) => void) {
    this.callback = callback;

    // Make the page tall enough to scroll
    document.body.style.height = '4000px';

    this.maxScroll = document.body.scrollHeight - window.innerHeight;

    window.addEventListener('scroll', this.handleScroll);
    this.handleScroll();
  }

  private handleScroll = (): void => {
    if (this.maxScroll <= 0) {
      this.callback(0);
      return;
    }

    const scrollY = window.scrollY;
    const progress = scrollY / this.maxScroll;

    this.callback(progress);
  };

  /**
   * Cleanup event listeners
   */
  public dispose(): void {
    window.removeEventListener('scroll', this.handleScroll);
  }
}
