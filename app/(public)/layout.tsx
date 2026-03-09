export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      {/* Simple header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                BANGUN JAYA TRANSINDO
              </h1>
              <p className="text-sm text-gray-600">WhatsApp Business CRM</p>
            </div>
            <nav className="flex space-x-6">
              <a href="/about" className="text-gray-600 hover:text-gray-900">
                About
              </a>
              <a href="/privacy-policy" className="text-gray-600 hover:text-gray-900">
                Privacy
              </a>
              <a href="/terms-of-service" className="text-gray-600 hover:text-gray-900">
                Terms
              </a>
              <a href="/dashboard" className="text-blue-600 hover:text-blue-800 font-medium">
                Login
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main>{children}</main>

      {/* Simple footer */}
      <footer className="bg-gray-50 border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-600 font-semibold">BANGUN JAYA TRANSINDO</p>
            <p className="text-sm text-gray-500 mt-2">
              WhatsApp Business CRM Platform
            </p>
            <p className="text-sm text-gray-500 mt-1">
              © {new Date().getFullYear()} All rights reserved.
            </p>
            <div className="mt-4 space-x-4">
              <a href="/about" className="text-sm text-gray-600 hover:text-gray-900">
                About Us
              </a>
              <a href="/privacy-policy" className="text-sm text-gray-600 hover:text-gray-900">
                Privacy Policy
              </a>
              <a href="/terms-of-service" className="text-sm text-gray-600 hover:text-gray-900">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
