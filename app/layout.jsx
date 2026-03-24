import './globals.css';

export const metadata = {
  title: 'Terry Heath',
  description: 'Small Things — A blog by Terry Heath',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}