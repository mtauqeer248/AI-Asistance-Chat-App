import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import 'highlight.js/styles/github-dark.css'
import './globals.css'

// Self-hosted variable fonts: no Google Fonts request at build time or runtime.
const geistSans = localFont({ src: './fonts/GeistVF.woff', variable: '--font-sans', weight: '100 900' })
const geistMono = localFont({ src: './fonts/GeistMonoVF.woff', variable: '--font-mono', weight: '100 900' })

export const metadata: Metadata = {
  title: 'DevAssist · AI coding assistant',
  description: 'A streaming AI assistant for developers, with saved snippet cards and inline explanations.',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0f17' },
  ],
}

// Runs before first paint so the page never flashes the wrong theme.
const themeScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>{children}</body>
    </html>
  )
}
