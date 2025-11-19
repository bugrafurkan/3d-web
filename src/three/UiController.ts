export interface UiSceneConfig {
  title: string;
  texts: string[];
  nextSceneTitle?: string; // text to show for the next scene popup
}

export class UiController {
  private textPanel: HTMLElement;
  private overlay: HTMLElement;
  private nextTitleEl: HTMLElement;
  private nextButton: HTMLButtonElement;

  private currentScene: UiSceneConfig | null = null;

  // We keep a copy of last progress to avoid unnecessary DOM work if desired
  private lastProgress: number = 0;

  constructor(onNextScene: () => void) {
    const textPanel = document.getElementById('scene-text-panel');
    const overlay = document.getElementById('scene-next-overlay');
    const nextTitleEl = document.getElementById('scene-next-title');
    const nextButton = document.getElementById('scene-next-button');

    if (!textPanel || !overlay || !nextTitleEl || !nextButton) {
      throw new Error('UiController: Missing UI elements in index.html');
    }

    this.textPanel = textPanel;
    this.overlay = overlay;
    this.nextTitleEl = nextTitleEl;
    this.nextButton = nextButton as HTMLButtonElement;

    this.nextButton.addEventListener('click', () => {
      // Hide overlay immediately and invoke callback
      this.hideNextOverlay();
      onNextScene();
    });

    this.hideNextOverlay();
  }

  public setScene(scene: UiSceneConfig): void {
    this.currentScene = scene;
    this.lastProgress = 0;

    // Reset text panel content
    this.textPanel.innerHTML = '';

    // Build all lines initially (hidden, we will reveal via classes)
    if (scene.texts && scene.texts.length > 0) {
      const fragment = document.createDocumentFragment();
      scene.texts.forEach((line) => {
        const p = document.createElement('p');
        p.textContent = line;
        fragment.appendChild(p);
      });
      this.textPanel.appendChild(fragment);
    }

    // Hide overlay on scene change
    this.hideNextOverlay();
  }

  public updateProgress(progress: number): void {
    if (!this.currentScene) return;

    // Clamp 0..1
    const clamped = Math.min(1, Math.max(0, progress));
    this.lastProgress = clamped;

    const texts = this.currentScene.texts ?? [];
    const lineCount = texts.length;
    const panelChildren = Array.from(this.textPanel.children) as HTMLElement[];

    if (lineCount === 0 || panelChildren.length === 0) {
      // Still handle next scene popup if needed
      this.updateNextOverlay(clamped);
      return;
    }

    // Simple mapping: reveal lines gradually as progress increases
    // For example, at progress=0.0 -> show first line,
    // progress=0.5 -> show ~half of lines, progress=1.0 -> show all.
    const visibleCount = Math.max(
      1,
      Math.min(lineCount, Math.ceil(clamped * lineCount))
    );

    panelChildren.forEach((el, index) => {
      if (index < visibleCount) {
        el.classList.add('visible');
      } else {
        el.classList.remove('visible');
      }
    });

    this.updateNextOverlay(clamped);
  }

  private updateNextOverlay(progress: number): void {
    if (!this.currentScene) return;

    const hasNext = !!this.currentScene.nextSceneTitle;

    // Show popup when progress is "almost" complete and there is a next scene
    if (progress >= 0.98 && hasNext) {
      this.nextTitleEl.textContent = this.currentScene.nextSceneTitle || '';
      this.overlay.classList.remove('hidden');
      this.overlay.classList.add('active');
    } else {
      this.hideNextOverlay();
    }
  }

  private hideNextOverlay(): void {
    this.overlay.classList.add('hidden');
    this.overlay.classList.remove('active');
  }

  public setPanelVisible(visible: boolean): void {
    if (visible) {
      this.textPanel.style.display = '';
    } else {
      this.textPanel.style.display = 'none';
    }
  }
}

