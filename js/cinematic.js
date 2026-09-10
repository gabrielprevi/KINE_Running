// Cinematic scroll treatment: staggered text reveals only.
// Background photos/video (.section-photo, .outdoor-hero-video) are static
// full-bleed covers — no scroll-linked transform — because motion requires
// spare media outside the frame to move within, and that oversized buffer
// is what left a leftover strip visible past the section edge while
// scrolling. Degrades silently to a static page if GSAP fails to load.
if (window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);

  gsap.from('.outdoor-hero-content > *', {
    y: 40,
    opacity: 0,
    duration: 0.9,
    stagger: 0.15,
    // expo.out é a curva-assinatura do sistema (cubic-bezier(0.19, 1, 0.22, 1)).
    ease: 'expo.out',
    scrollTrigger: {
      trigger: '.outdoor-hero',
      start: 'top 75%'
    }
  });

  gsap.from('.collection--alt .section-head > *', {
    y: 30,
    opacity: 0,
    duration: 0.8,
    stagger: 0.12,
    // expo.out é a curva-assinatura do sistema (cubic-bezier(0.19, 1, 0.22, 1)).
    ease: 'expo.out',
    scrollTrigger: {
      trigger: '.collection--alt',
      start: 'top 70%'
    }
  });
}
