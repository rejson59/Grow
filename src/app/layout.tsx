import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "grow. — Symulator inwestowania w krypto i na GPW",
  description: "Ucz się inwestowania bez ryzyka. Wirtualny portfel, prawdziwe notowania krypto i polskiej giełdy, lekcje, quizy oraz praktyczne wskazówki.",
  applicationName: "grow.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
