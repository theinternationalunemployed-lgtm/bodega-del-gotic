// Sombra de la cabecera, sección activa del menú y aparición de elementos al hacer scroll.
(() => {
  const top = document.querySelector('.top');
  const onScroll = () => top.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const links = [...document.querySelectorAll('.menu a')];
  const spy = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) links.forEach((a) => a.classList.toggle('on', a.hash === `#${e.target.id}`));
  }), { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((a) => spy.observe(document.querySelector(a.hash)));

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.documentElement.classList.add('js');
  const show = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('visible');
    show.unobserve(e.target);
  }), { rootMargin: '0px 0px -8% 0px' });

  document.querySelectorAll('section:not(.hero) h2, section:not(.hero) .wrap > p, .carta > div, .galeria > *, .horario table, .horario address, .horario .btn, .mapa, .contacto .btns > *')
    .forEach((el) => {
      el.classList.add('reveal');
      // Escalonado entre hermanos, sin esperas largas en listas grandes
      el.style.setProperty('--retraso', `${[...el.parentNode.children].indexOf(el) % 4 * 80}ms`);
      show.observe(el);
    });
})();
