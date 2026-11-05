/** Hand-drawn pixel SVGs are bundled locally; original detailed flags are a fallback. */
export function setPixelFlag(image: HTMLImageElement, iso: string): void {
 image.dataset.flag = iso;
 image.onerror = () => {
  image.onerror = null;
  image.src = `/flags/${iso}.svg`;
 };
 image.src = `/pixel-flags/${iso}.svg`;
}
