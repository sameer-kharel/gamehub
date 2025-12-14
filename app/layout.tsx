import type { Metadata } from "next";
import { Orbitron, Inter } from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MT Gamehub |  Gaming Station | Sagarmatha Chowk, Bhardapur, Jhapa",
  description: "Experience premium  gaming at MT Gamehub. Play the latest games including FC 26, WWE 2K25, GTA V, and more. Located in Sagarmatha Chowk, Jhapa.",
  keywords: ["gaming", "PlayStation", "gaming station", "Jhapa", "Sagarmatha Chowk", "Bhardapur", "Nepal", "MT Gamehub"],
  authors: [{ name: "MT Gamehub" }],
  openGraph: {
    title: "MT Gamehub |  Gaming Station at Jhapa, Bhardapur",
    description: "Play. Compete. Repeat. Premium  gaming in Sagarmatha Chowk, Jhapa.",
    type: "website",
    images: [
      {
        url: "https://i.ibb.co/ZzFYLfXt/image.png",
        width: 1200,
        height: 630,
        alt: "MT Gamehub | Gaming Station at Jhapa, Bhardapur",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${orbitron.variable} ${inter.variable} antialiased`}
        style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
