// Exportación estática: se sirve desde GitHub Pages junto a la web, sin servidor Node.
// BASE_PATH = carpeta donde se publica, p. ej. "/reservas" (dominio propio) o "/bodega-del-gotic/reservas" (github.io).
export default {
  output: 'export',
  basePath: process.env.BASE_PATH || '',
  trailingSlash: true,
};
