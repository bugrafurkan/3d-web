export class FinalChoiceController {
  private root: HTMLElement;
  private positiveBtn: HTMLButtonElement;
  private negativeBtn: HTMLButtonElement;
  private celebrationEl: HTMLElement;
  private musicEl: HTMLAudioElement | null;

  private isActive = false;
  private hasCelebrated = false;

  constructor() {
    const root = document.getElementById('final-choice-overlay');
    const posBtn = document.getElementById('final-choice-positive');
    const negBtn = document.getElementById('final-choice-negative');
    const celebration = document.getElementById('final-celebration');
    const music = document.getElementById('final-music') as HTMLAudioElement | null;

    if (!root || !posBtn || !negBtn || !celebration) {
      throw new Error('FinalChoiceController: Missing final choice DOM elements');
    }

    this.root = root;
    this.positiveBtn = posBtn as HTMLButtonElement;
    this.negativeBtn = negBtn as HTMLButtonElement;
    this.celebrationEl = celebration;
    this.musicEl = music ?? null;

    // Positive: trigger celebration
    this.positiveBtn.addEventListener('click', () => {
      if (!this.isActive || this.hasCelebrated) return;
      this.startCelebration();
    });

    // Negative: evade on hover/move
    this.negativeBtn.addEventListener('mouseenter', () => {
      if (!this.isActive) return;
      this.evade();
    });
    this.negativeBtn.addEventListener('mousemove', () => {
      if (!this.isActive) return;
      this.evade();
    });
  }

  public show(): void {
    this.isActive = true;
    this.root.classList.remove('hidden');
    this.root.classList.add('active');

    // Reset state
    this.hasCelebrated = false;
    this.root.classList.remove('celebrate');
    this.celebrationEl.classList.remove('active');

    // Try to start music (may be blocked by autoplay policies)
    if (this.musicEl) {
      this.musicEl.currentTime = 0;
      this.musicEl.play().catch(() => {
        // If blocked, user can click positive later which will also be a gesture.
      });
    }

    // Place negative button initially in the right area
    this.resetNegativeButtonPosition();
  }

  public hide(): void {
    this.isActive = false;
    this.root.classList.remove('active');
    this.root.classList.add('hidden');

    if (this.musicEl) {
      this.musicEl.pause();
    }
  }

  private resetNegativeButtonPosition(): void {
    // Button is now outside the box, can move anywhere on screen
    const btn = this.negativeBtn;
    
    const maxX = window.innerWidth - btn.offsetWidth - 20; // 20px margin
    const maxY = window.innerHeight - btn.offsetHeight - 20;

    // Start somewhere random on screen (but visible)
    const x = 50 + Math.random() * (maxX - 100);
    const y = 50 + Math.random() * (maxY - 100);

    btn.style.left = `${x}px`;
    btn.style.top = `${y}px`;
  }

  private evade(): void {
    // Button can now escape anywhere on the screen
    const btn = this.negativeBtn;
    
    const maxX = window.innerWidth - btn.offsetWidth - 20; // 20px margin
    const maxY = window.innerHeight - btn.offsetHeight - 20;

    // Jump to a completely random position
    const randX = 20 + Math.random() * maxX;
    const randY = 20 + Math.random() * maxY;

    btn.style.left = `${randX}px`;
    btn.style.top = `${randY}px`;
  }

  private startCelebration(): void {
    this.hasCelebrated = true;

    // Activate CSS celebration
    this.root.classList.add('celebrate');
    this.celebrationEl.classList.remove('hidden');
    this.celebrationEl.classList.add('active');

    // Extra: small pulse effect on box (optional)
    this.root.animate(
      [
        { transform: 'scale(1)', filter: 'brightness(1)' },
        { transform: 'scale(1.02)', filter: 'brightness(1.2)' },
        { transform: 'scale(1)', filter: 'brightness(1)' }
      ],
      {
        duration: 700,
        easing: 'ease-out'
      }
    );

    console.log('🎉 KUTLAMA BAŞLADI! Güzel bir yıl oldu! 🌟');
  }
}

