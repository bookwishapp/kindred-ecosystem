import './globals.css';

export const metadata = {
  title: 'Damp Concrete',
  description: 'Software from Port Orchard, WA.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
