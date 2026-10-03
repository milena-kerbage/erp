import { Inter } from "next/font/google";
import localFont from "next/font/local";

/** Fonte base do sistema (textos, interface, títulos comuns). */
export const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

/** Fonte da marca — uso restrito a títulos de destaque, conforme o manual. */
export const scarlett = localFont({
  src: "./Scarlett.woff2",
  variable: "--font-scarlett",
  weight: "400",
  style: "normal",
  display: "swap",
});

export const fontVariables = `${inter.variable} ${scarlett.variable}`;
