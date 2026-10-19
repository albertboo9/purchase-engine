import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import "./globals.css";

/** Polices de la marque Studies Learning (servies localement, aucune requête externe). */
const instrument = localFont({ src: "./fonts/InstrumentSans-normal-400-700-latin.woff2", variable: "--font-instrument", display: "swap" });
const literata = localFont({
  src: [
    { path: "./fonts/Literata-normal-400-700-latin.woff2", weight: "400 700", style: "normal" },
    { path: "./fonts/Literata-italic-400-latin.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-literata",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Paiement sécurisé · Studies Learning", template: "%s · Studies Learning" },
  description: "Finalisez votre inscription ou votre achat de licences Studies Learning en toute sécurité.",
  icons: { icon: "/brand/monogram-violet-32.png", apple: "/brand/app-violet-180.png" },
  robots: { index: false, follow: false },
  // Les liens d'enchère portent un jeton : jamais transmis aux sites du prestataire (seule l'origine part).
  referrer: "strict-origin-when-cross-origin",
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#F8F7FF" }, { media: "(prefers-color-scheme: dark)", color: "#0B0820" }],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${instrument.variable} ${literata.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <Toaster position="top-center" richColors closeButton toastOptions={{ style: { borderRadius: 16, fontFamily: "var(--font-sans)" } }} />
      </body>
    </html>
  );
}
