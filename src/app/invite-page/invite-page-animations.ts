export function createInvitePageRevealObserver(
  selector = '[data-animate]',
): IntersectionObserver | undefined {
  if (typeof IntersectionObserver === 'undefined' || typeof document === 'undefined') {
    return undefined;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
    },
  );

  queueMicrotask(() => {
    document.querySelectorAll(selector).forEach((element) => observer.observe(element));
  });

  return observer;
}
