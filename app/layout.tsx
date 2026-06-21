import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ajedrez — Hub de Juegos en Familia',
  description: 'Ajedrez online por turnos para jugar en familia desde el Hub.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-tablaFondo text-crema antialiased">{children}</body>
    </html>
  );
}
