import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Async AI Pipeline Backend",
  description: "Backend for the Async AI Content Pipeline",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
