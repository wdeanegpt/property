import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Property Management System',
  description: 'Interactive overview of the comprehensive property management system project',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-blue-600 text-white shadow-md">
            <div className="container mx-auto px-4 py-6">
              <h1 className="text-3xl font-bold">Property Management System</h1>
              <p className="mt-2">A comprehensive platform with AI-enhanced capabilities</p>
            </div>
          </header>
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
          <footer className="bg-gray-800 text-white py-6">
            <div className="container mx-auto px-4 text-center">
              <p>© 2025 Property Management System</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
