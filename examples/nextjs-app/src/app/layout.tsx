import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { NebulusProvider } from '@/lib/nebulus/provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'NebulusDB Next.js Example',
  description: 'A Next.js example using NebulusDB with IndexedDB and SSR fallback',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NebulusProvider>
          {children}
        </NebulusProvider>
      </body>
    </html>
  )
}
