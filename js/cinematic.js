// Cinematic scroll treatment: staggered text reveals, plus a one-shot
// (não scroll-scrubbed) scale/opacity reveal no wrapper do vídeo do
// Manifesto. Nunca usar transform CONTÍNUO/scrubado ligado ao progresso do
// scroll em .section-photo ou .outdoor-hero-video: isso exigiria mídia maior
// que o frame pra ter margem de movimento, e foi esse buffer sobrando que
// deixou uma tira visível passando da borda da seção da vez anterior que
// isso foi tentado. Degrada silenciosamente pra página estática se o GSAP
// não carregar.
if (window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);

  // Entrada do vídeo do Manifesto: escala/opacidade num timeline só, disparo
  // único por passagem de scroll (reverte se o usuário rolar de volta pra
  // cima). Anima .outdoor-hero-media (não o <video> direto) — a seção já tem
  // overflow:hidden, então o leve scale-down some dentro dela sem vazar nem
  // recortar o vídeo. Legenda entra logo depois, sobrepondo o fim do reveal.
  const outdoorReveal = gsap.timeline({
    scrollTrigger: {
      trigger: '#performance',
      start: 'top 75%',
      toggleActions: 'play none none reverse'
    }
  });
  outdoorReveal
    .from('#performance .outdoor-hero-media', {
      opacity: 0,
      scale: 0.94,
      transformOrigin: '50% 100%',
      duration: 0.9,
      ease: 'expo.out'
    })
    .from('.outdoor-hero-content > *', {
      y: 40,
      opacity: 0,
      duration: 0.9,
      stagger: 0.15,
      // expo.out é a curva-assinatura do sistema (cubic-bezier(0.19, 1, 0.22, 1)).
      ease: 'expo.out'
    }, '-=0.4');

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
