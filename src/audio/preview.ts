// Dev page for listening to and tuning sound effects: open /sfx-preview.html in the Vite dev server.
import { Sfx } from './sfx';
import { SOUNDS, type SfxId } from './sounds';
import { renderSound, type SoundDef } from './synth';

const sfx = new Sfx();
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const edit = $<HTMLTextAreaElement>('edit');
const err = $('err');
let selected: SfxId | null = null;
let editCtx: AudioContext | null = null;

function select(id: SfxId, btn: HTMLButtonElement): void {
  document.querySelectorAll('button.sel').forEach((b) => b.classList.remove('sel'));
  btn.classList.add('sel');
  selected = id;
  $('edit-title').textContent = `Bearbeiten: ${id}`;
  edit.value = JSON.stringify(SOUNDS[id], null, 2);
  err.textContent = '';
}

const groups = new Map<string, SfxId[]>();
for (const id of Object.keys(SOUNDS) as SfxId[]) {
  const g = id.split('.')[0];
  groups.set(g, [...(groups.get(g) ?? []), id]);
}
for (const [g, ids] of groups) {
  const h = document.createElement('h2');
  h.textContent = g;
  const row = document.createElement('div');
  row.className = 'row';
  for (const id of ids) {
    const b = document.createElement('button');
    b.textContent = id.slice(g.length + 1);
    b.onclick = () => {
      sfx.unlock();
      sfx.play(id);
      select(id, b);
    };
    row.append(b);
  }
  $('groups').append(h, row);
}

$<HTMLInputElement>('vol').oninput = (e) => sfx.setVolume(Number((e.target as HTMLInputElement).value));

$('all').onclick = async () => {
  sfx.unlock();
  for (const id of Object.keys(SOUNDS) as SfxId[]) {
    sfx.play(id);
    await new Promise((r) => setTimeout(r, 900));
  }
};

$('play-edit').onclick = () => {
  try {
    const def = JSON.parse(edit.value) as SoundDef;
    editCtx ??= new AudioContext();
    const samples = renderSound(def, { sampleRate: editCtx.sampleRate });
    const buf = editCtx.createBuffer(1, samples.length, editCtx.sampleRate);
    buf.copyToChannel(samples, 0);
    const src = editCtx.createBufferSource();
    src.buffer = buf;
    const g = editCtx.createGain();
    g.gain.value = Number($<HTMLInputElement>('vol').value);
    src.connect(g).connect(editCtx.destination);
    src.start();
    err.textContent = '';
  } catch (e) {
    err.textContent = String(e);
  }
};

$('copy').onclick = () => {
  const key = selected ? `'${selected}': ` : '';
  void navigator.clipboard.writeText(`${key}${edit.value},`);
};
