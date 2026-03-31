import './globals.css'

export const metadata = {
  title: 'Passportr',
  description: 'Digital event passports',
  openGraph: {
    title: 'Passportr — Digital event passports',
    description: 'Replace paper passports with digital ones. No app required. Built for hops, crawls, and multi-venue events.',
    images: [
      {
        url: 'https://passportr.io/og.png',
        width: 1200,
        height: 630,
        alt: 'Passportr — Digital event passports',
      },
    ],
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Lora:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
