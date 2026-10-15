import type { Metadata } from "next";
import "./globals.css";
import Nav from "./_common-components/NavComponent/Nav";

export const metadata: Metadata = {
  title: "Sai Kireeti Kasula · Portfolio",
  description:
    "Portfolio of Sai Kireeti Kasula — frontend engineer building enterprise React applications.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  );
}
