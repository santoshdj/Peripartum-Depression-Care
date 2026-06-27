import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";
import { GateProvider } from "@/context/gate-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Peripartum Care",
  description: "Your peripartum depression care companion",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <GateProvider>
          <NavBar />
          <main className="min-h-screen bg-gray-50">{children}</main>
        </GateProvider>
      </body>
    </html>
  );
}
