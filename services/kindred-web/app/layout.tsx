import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kindred',
  description: 'Stay close to the people who matter',
  metadataBase: new URL('https://fromkindred.com'),
  openGraph: {
    title: 'Kindred',
    description: 'Stay close to the people who matter',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}