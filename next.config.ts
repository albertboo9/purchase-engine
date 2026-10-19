import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Le dossier parent (méta-dépôt) contient un autre package-lock : sans racine explicite, Turbopack surveille
  // tout l'écosystème et le serveur de développement s'enlise.
  turbopack: { root: __dirname },
};

export default nextConfig;
