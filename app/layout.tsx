import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "orm_test — ORM и прямой SQL",
  description: "SQLite, четыре языка, реальные измерения. Результаты, исходный код и повторение теста.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ru" suppressHydrationWarning><body>{children}</body></html>;
}
