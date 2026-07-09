import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AeroFlow AI — Smart City Command Center",
  description: "Proactive PM2.5 prediction & traffic optimization dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="h-full bg-panel text-[#e6edf3] antialiased">
        {children}
      </body>
    </html>
  );
}
