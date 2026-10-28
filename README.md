# Bodega del Gòtic · web

Web estática (HTML + CSS + ~6 líneas de JS). Sin librerías ni proceso de compilación: se sube tal cual.

```
index.html        castellano (portada, idioma por defecto)
ca/index.html     català
en/index.html     English
aviso-legal.html, privacidad.html, cookies.html   (solo en castellano)
styles.css, favicon.svg, robots.txt, sitemap.xml
img/              crear y poner aquí las fotos (WebP)
```

## Editar carta u horario
Cada idioma es un archivo. Busca `EDITAR` / `EDIT` y cambia **los tres** archivos.
El horario también está en el bloque `openingHoursSpecification` del `<head>` de cada uno (es lo que lee Google).

## Pendiente de pedir al cliente
- [ ] Carta definitiva con precios (y qué va en tapas / raciones / arroces / postres / bebidas)
- [ ] Resto de bebidas (vinos, vermut, refrescos, cafés…)
- [ ] Foto de portada del local (horizontal, ≥1600 px)
- [ ] 8 fotos para la galería (platos, cerveza, local), propias del cliente
- [ ] Foto para compartir en redes 1200×630 → `img/og.jpg` y descomentar `og:image`
- [ ] Número de WhatsApp
- [ ] Email de contacto
- [ ] Instagram / otras redes
- [ ] ¿Reservan por TheFork u otra plataforma? Enlace
- [ ] Razón social, NIF y (si es sociedad) datos del Registro Mercantil
- [ ] Proveedor de hosting (para la política de privacidad)
- [ ] Confirmar que la valoración (4,4★ / ~950 reseñas) sigue vigente al publicar
- [ ] Confirmar el dominio: `bodegadelgtic.com` (sin la "o" de Gòtic): ¿es el correcto?

## Fotos
Convertir a WebP (p. ej. con squoosh.app), ~800×600 px para la galería y ~1600 px de ancho para la portada,
guardarlas en `img/` y sustituir cada `<div class="ph" …>` por el `<img>` que aparece comentado justo encima.

## Publicar en bodegadelgtic.com
1. Contrata un hosting estático (Netlify, Cloudflare Pages o GitHub Pages son gratis; o el hosting donde esté el dominio).
2. Sube el contenido de esta carpeta a la raíz del sitio (sin este README si se prefiere).
3. En el registrador del dominio, apunta los DNS a lo que indique el hosting (registro A o CNAME) y activa HTTPS.
4. Comprueba que abren `https://bodegadelgtic.com/`, `/ca/` y `/en/`.
5. En Google Search Console: añade el dominio, verifícalo y envía `https://bodegadelgtic.com/sitemap.xml`.
6. Valida los datos estructurados en https://search.google.com/test/rich-results

## Enlazarla en Google Maps (Perfil de Empresa de Google)
1. Entra en https://business.google.com con la cuenta que gestiona la ficha (o reclama la ficha si nadie la gestiona).
2. Editar perfil → Contacto → **Sitio web**: `https://bodegadelgtic.com/`
3. Editar perfil → **Carta / Menú**: enlace `https://bodegadelgtic.com/#carta`
4. Revisa que horario, teléfono y dirección coincidan exactamente con los de la web.
