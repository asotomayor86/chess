import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Tablero clásico (estilo lichess/madera).
        casillaClara: '#f0d9b5',
        casillaOscura: '#b58863',
        // Resaltados.
        seleccion: '#f6f669',
        ultimo: '#cdd26a',
        movimiento: '#7fb069',
        jaque: '#e06c5e',
        // Interfaz (pizarra neutra).
        tinta: '#2b2b29',
        tablaFondo: '#312e2b',
        tablaPanel: '#272421',
        crema: '#efe9df',
        blancas: '#f5f5f0',
        negras: '#2b2b29',
        acento: '#7a9e5e',
        acentoOscuro: '#5f7d48',
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        title: ['"Cinzel"', 'Georgia', 'serif'],
      },
      boxShadow: {
        panel: '0 4px 14px rgba(0, 0, 0, 0.3)',
        tablero: '0 8px 30px rgba(0, 0, 0, 0.45)',
      },
    },
  },
  plugins: [],
};

export default config;
