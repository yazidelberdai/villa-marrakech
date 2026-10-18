// "Take a photo": hides the interface and renders the current view at high resolution, ready to save.
export class PhotoMode {
  constructor({ renderer, render, ui }) {
    Object.assign(this, { renderer, render, ui });
    this.active = false; this.url = null;
  }

  // scale = supersampling factor relative to the screen (2 → 4× the pixels)
  async start(scale = 2) {
    if (this.active) return;
    this.active = true;
    this.ui.show('Developing photo…');
    await new Promise((r) => setTimeout(r, 30));
    const { renderer } = this, pr = renderer.getPixelRatio();
    renderer.setPixelRatio(Math.min(3, Math.max(pr, 1) * scale));
    this.render(true);
    const w = renderer.domElement.width, h = renderer.domElement.height;
    this.url = renderer.domElement.toDataURL('image/jpeg', 0.93);
    renderer.setPixelRatio(pr);
    this.render(false);
    this.ui.show(`Photo ready · ${w} × ${h} px`, true, this.url);
  }

  download() {
    if (!this.url) return;
    const a = document.createElement('a');
    a.href = this.url;
    a.download = `villa-marrakech-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.jpg`;
    a.click();
  }

  stop() { this.active = false; this.url = null; this.ui.hide(); }
}
