import './globals.css';

export const metadata = {
  title: 'Jigsaw AI - Lead Intelligence Platform',
  description: 'AI-powered sales intelligence for web agencies',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}