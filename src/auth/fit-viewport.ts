/** Fit the complete form, including async provider messages, without clipping controls. */
export function fitAuthViewport(page: HTMLElement, content: HTMLElement): () => void {
  const fit = () => {
    const scale = Math.min(1, (page.clientHeight - 16) / content.offsetHeight);
    content.style.setProperty('--auth-scale', String(Math.max(0.01, scale)));
  };
  const observer = new ResizeObserver(fit);
  observer.observe(page);
  observer.observe(content);
  fit();
  return () => observer.disconnect();
}
