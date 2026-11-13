/* Minimal native input handoff experiment. No independent uploader or GF submit override. */
(() => {
  'use strict';
  const controllers = new WeakMap();

  function attach(editor) {
    if (controllers.has(editor)) return;
    const form = editor.closest('form');
    const field = editor.closest('.gfield');
    if (!form || !field) return;
    const input = field.querySelector('input[type="file"]');
    const marker = editor.querySelector('input[type="hidden"]');
    const controls = editor.querySelector('.gfncr-controls');
    const preview = editor.querySelector('.gfncr-preview');
    const crop = editor.querySelector('.gfncr-crop');
    const rotate = editor.querySelector('.gfncr-rotate');
    const confirm = editor.querySelector('.gfncr-confirm');
    const cancel = editor.querySelector('.gfncr-cancel');
    const status = editor.querySelector('.gfncr-status');
    if (!input || input.multiple || !marker || !controls || !confirm) return;
    const state = { generation: 0, source: null, bitmap: null, edited: null, busy: false, failed: false, assigning: false, angle: 0, url: null, previewTransform: null };
    controllers.set(editor, state);

    function message(text) { status.textContent = text; }
    function cleanup() {
      state.generation++;
      if (state.bitmap) state.bitmap.close();
      if (state.url) URL.revokeObjectURL(state.url);
      state.bitmap = null;
      state.url = null;
      state.source = null;
      state.edited = null;
      state.busy = false;
      state.failed = false;
      state.angle = 0;
      // Restore only our editor rotation, keeping any pre-existing layout transform.
      if (state.previewTransform !== null) preview.style.transform = state.previewTransform;
      state.previewTransform = null;
      marker.value = '';
      input.value = ''; // Critical: original file never remains eligible for native submission.
      controls.hidden = true;
      confirm.disabled = false;
    }
    function ready() { return !!state.edited && !state.busy && input.files.length === 1 && input.files[0] === state.edited && marker.value === 'confirmed'; }
    function blocksSubmission() {
      // Optional, untouched field is allowed; file selected or pending requires a confirmed edited File.
      return !!(state.source || state.busy || state.failed || input.files.length) && !ready();
    }
    function guard(event) {
      if (!blocksSubmission()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      message('Confirm the image crop before continuing.');
    }
    form.addEventListener('submit', guard, true);
    form.addEventListener('click', (event) => {
      if (event.target.closest('button[type="submit"], input[type="submit"]')) guard(event);
    }, true);

    input.addEventListener('change', async () => {
      if (state.assigning) return;
      const picked = input.files[0] || null;
      cleanup();
      if (!picked) { message('Choose an image to edit.'); return; }
      state.source = picked; // Retained only in browser memory, never in the native input.
      const gen = state.generation;
      if (!['image/png', 'image/jpeg'].includes(picked.type) || picked.size > 12 * 1024 * 1024) {
        message('Only JPG/PNG up to 12 MB is supported in this prototype.');
        state.source = null;
        state.failed = true;
        return;
      }
      message('Preparing image…');
      try {
        const bitmap = await createImageBitmap(picked);
        if (gen !== state.generation) { bitmap.close(); return; }
        if (bitmap.width > 6000 || bitmap.height > 6000) {
          bitmap.close(); state.source = null;
          throw new Error('Image dimensions exceed the prototype limit.');
        }
        state.bitmap = bitmap;
        state.url = URL.createObjectURL(picked);
        preview.src = state.url;
        controls.hidden = false;
        crop.value = '75';
        message('Adjust the center crop, rotate if needed, then confirm.');
      } catch (error) {
        if (gen !== state.generation) return;
        state.source = null;
        state.failed = true;
        message('Could not open this image. Select another JPG/PNG.');
      }
    });

    rotate.addEventListener('click', () => {
      if (!state.bitmap || state.busy) return;
      if (state.previewTransform === null) state.previewTransform = preview.style.transform;
      state.angle = (state.angle + 90) % 360;
      preview.style.transform = state.previewTransform + (state.previewTransform ? ' ' : '') + 'rotate(' + state.angle + 'deg)';
      message('Rotation ' + state.angle + '°. Confirm to apply.');
    });
    cancel.addEventListener('click', () => { cleanup(); message('Editing cancelled. No image will be uploaded.'); });

    confirm.addEventListener('click', async () => {
      if (state.busy || !state.source || !state.bitmap) return;
      state.busy = true;
      confirm.disabled = true;
      const gen = state.generation;
      marker.value = '';
      message('Exporting edited image…');
      try {
        const bitmap = state.bitmap;
        const fraction = Number(crop.value) / 100;
        const w = Math.max(1, Math.floor(bitmap.width * fraction));
        const h = Math.max(1, Math.floor(bitmap.height * fraction));
        const turn = state.angle % 180 !== 0;
        const canvas = document.createElement('canvas');
        canvas.width = turn ? h : w;
        canvas.height = turn ? w : h;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas not available');
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(state.angle * Math.PI / 180);
        ctx.drawImage(bitmap, (bitmap.width - w) / 2, (bitmap.height - h) / 2, w, h, -w / 2, -h / 2, w, h);
        const mime = state.source.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const blob = await new Promise(resolve => canvas.toBlob(resolve, mime, 0.92));
        if (gen !== state.generation) return;
        if (!blob || blob.type !== mime || !blob.size) throw new Error('Export failed');
        const extension = mime === 'image/png' ? '.png' : '.jpg';
        const originalName = state.source.name.replace(/\.[^/.]+$/, '').slice(0, 100) || 'image';
        const edited = new File([blob], originalName + '-edited' + extension, { type: mime, lastModified: Date.now() });
        const transfer = new DataTransfer();
        transfer.items.add(edited);
        input.files = transfer.files;
        if (input.files.length !== 1 || input.files[0] !== edited) throw new Error('Native FileList replacement failed');
        state.edited = edited;
        marker.value = 'confirmed';
        controls.hidden = true;
        state.busy = false;
        state.assigning = true;
        try { input.dispatchEvent(new Event('change', { bubbles: true })); } // Notify GF/other native listeners.
        finally { state.assigning = false; }
        message('Edited file ready: ' + canvas.width + '×' + canvas.height + ', ' + edited.size + ' bytes.');
      } catch (error) {
        if (gen !== state.generation) return;
        cleanup();
        state.failed = true;
        message('Edited file could not be handed to the native upload input. Please select again.');
      } finally {
        if (gen === state.generation) { state.busy = false; confirm.disabled = false; }
      }
    });
  }

  function scan() { document.querySelectorAll('.gfncr-editor').forEach(attach); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan);
  else scan();
  document.addEventListener('gform/post_render', scan);
  document.addEventListener('gform/ajax/post_page_change', scan);
  document.addEventListener('gform_page_loaded', scan);
})();
