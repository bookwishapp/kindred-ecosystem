import './globals.css';

export const metadata = {
  title: 'Damp Concrete Admin',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
