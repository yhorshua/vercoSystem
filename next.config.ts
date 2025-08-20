import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true, // Activar el modo estricto de React para detectar problemas en el desarrollo
  images: {
    domains: ['example.com'], // Permite cargar imágenes desde dominios externos
  },
  eslint: {
    // Configuración de ESLint: desactivar advertencias durante la construcción
    ignoreDuringBuilds: true,
  },
  webpack(config) {
    // Modificar la configuración de Webpack si es necesario
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });
    return config;
  },
  /* Puedes agregar más opciones de configuración de Next.js aquí */
};

export default nextConfig;
