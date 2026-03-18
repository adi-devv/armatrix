import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Team — Armatrix",
  description: "Meet the team building the future of robotic inspection at Armatrix.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
