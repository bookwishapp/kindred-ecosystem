import './globals.css';
import PublicFooter from './components/PublicFooter';

export const metadata = {
  title: 'Small Things',
  description: 'Letters from the bookstore, the workshop, and everywhere in between.',
  openGraph: {
    title: 'Small Things',
    description: 'Letters from the bookstore, the workshop, and everywhere in between.',
    images: [
      {
        url: 'https://terryheath.com/small_things.png',
        width: 1200,
        height: 630,
        alt: 'Small Things — Letters from the bookstore, the workshop, and everywhere in between.',
      },
    ],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <PublicFooter />
      </body>
    </html>
  );
}