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
        <meta
          name="description"
          content="Instantly create an MCP server for any GitHub project"
        />

        <meta property="og:url" content="https://gitmcp.io/" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="GitMCP" />
        <meta
          property="og:description"
          content="Instantly create an MCP server for any GitHub project"
        />
        <meta
          property="og:image"
          content="https://opengraph.b-cdn.net/production/images/867f1ab4-33c9-4f5a-b998-dc349082535e.png?token=T6nnE4yCwb_bj5odjb8ZXuHUEleLddj1vOVDtQoUHas&height=598&width=1200&expires=33279701815"
        />

        <meta name="twitter:card" content="summary_large_image" />
        <meta property="twitter:domain" content="gitmcp.io" />
        <meta property="twitter:url" content="https://gitmcp.io/" />
        <meta name="twitter:title" content="GitMCP" />
        <meta
          name="twitter:description"
          content="Instantly create an MCP server for any GitHub project"
        />
        <meta
          name="twitter:image"
          content="https://opengraph.b-cdn.net/production/images/867f1ab4-33c9-4f5a-b998-dc349082535e.png?token=T6nnE4yCwb_bj5odjb8ZXuHUEleLddj1vOVDtQoUHas&height=598&width=1200&expires=33279701815"
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
