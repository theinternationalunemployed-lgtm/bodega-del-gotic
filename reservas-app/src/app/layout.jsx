import './globals.css';

export const metadata = {
  title: 'Reservar mesa · Bodega del Gòtic',
  description: 'Reserva tu mesa en Bodega del Gòtic, bar de tapas en Plaça de Correus, 7, Barcelona.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-crema text-tinta antialiased">{children}</body>
    </html>
  );
}
