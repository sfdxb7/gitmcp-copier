import "./globals.css";
import { Inter } from "next/font/google";

// Initialize the Inter font
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata = {
  title: "GitMCP",
  description: "Instantly create an MCP server for any GitHub project",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <head>
        <link rel="icon" href="/icon_black_cropped.png" />
        <title>GitMCP</title>
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
