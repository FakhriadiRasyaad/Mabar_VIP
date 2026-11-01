import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mabar VIP — Platform Main Bareng Berbayar",
  description:
    "Platform monetisasi mabar untuk gamer & streamer. Katalog mabar, pembayaran otomatis via QRIS/VA, alokasi nomor antrean real-time, dan alert pop-up interaktif langsung di layar OBS.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Archivo+Black&family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Courier+Prime:wght@400;700&family=Lexend+Mega:wght@400..900&family=Plus+Jakarta+Sans:wght@400..800&family=Sora:wght@400..800&family=Space+Grotesk:wght@400..700&family=Space+Mono:wght@400;700&family=Syne:wght@700..800&display=swap"
          rel="stylesheet"
        />
        {/* Anti-FOUC Theme Initializer Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('mabar_theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (saved === 'dark' || (!saved && prefersDark)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}
