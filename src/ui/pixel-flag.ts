/** Hand-drawn pixel SVGs are bundled locally; original detailed flags are a fallback. */
export function setPixelFlag(image: HTMLImageElement, iso: string): void {
 image.dataset.flag = iso;
 image.onerror = () => {
  image.onerror = null;
  image.src = `${import.meta.env.BASE_URL}flags/${iso}.svg`;
 };
 image.src = `${import.meta.env.BASE_URL}pixel-flags/${iso}.svg`;
}
