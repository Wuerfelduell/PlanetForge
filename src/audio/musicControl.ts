import type { Music } from './music';

/**
 * A small floating 🎵 button with a popover: music on/off and volume.
 * Lives outside the HUD, which is re-rendered several times a second.
 */
export function mountMusicControl(music: Music, parent: HTMLElement = document.body): void {
  const root = document.createElement('div');
  root.id = 'music-control';
  root.innerHTML = `
    <button class="music-toggle" aria-label="Musik" title="Musik"></button>
    <div class="music-pop" hidden>
      <label><input type="checkbox" class="music-on"> Musik</label>
      <input type="range" class="music-volume" min="0" max="100" step="5" aria-label="Lautstärke">
    </div>`;
  parent.appendChild(root);

  const toggle = root.querySelector<HTMLButtonElement>('.music-toggle')!;
  const pop = root.querySelector<HTMLDivElement>('.music-pop')!;
  const on = root.querySelector<HTMLInputElement>('.music-on')!;
  const volume = root.querySelector<HTMLInputElement>('.music-volume')!;

  const sync = () => {
    const s = music.state;
    toggle.textContent = s.enabled && s.volume > 0 ? '🎵' : '🔇';
    toggle.classList.toggle('off', !s.enabled);
    on.checked = s.enabled;
    volume.value = String(Math.round(s.volume * 100));
    volume.disabled = !s.enabled;
  };
  music.onChange(sync);
  sync();

  toggle.addEventListener('click', () => {
    music.unlock();
    pop.hidden = !pop.hidden;
  });
  on.addEventListener('change', () => {
    music.unlock();
    music.setEnabled(on.checked);
  });
  volume.addEventListener('input', () => music.setVolume(Number(volume.value) / 100));
  document.addEventListener('pointerdown', (e) => {
    if (!pop.hidden && !root.contains(e.target as Node)) pop.hidden = true;
  });
}

/** Starts music on the first tap or key press; browsers block audio before a user gesture. */
export function unlockMusicOnFirstGesture(music: Music): void {
  const start = () => {
    music.unlock();
    window.removeEventListener('pointerdown', start, true);
    window.removeEventListener('keydown', start, true);
  };
  window.addEventListener('pointerdown', start, true);
  window.addEventListener('keydown', start, true);
}
