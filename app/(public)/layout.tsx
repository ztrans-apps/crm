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

      {/* Footer with company information */}
      <footer className="bg-gray-900 text-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Company Info */}
            <div>
              <h3 className="text-xl font-bold mb-4">BANGUN JAYA TRANSINDO</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                Professional WhatsApp Business CRM solution for modern businesses. 
                Manage conversations, contacts, and customer relationships efficiently.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li>
                  <a href="/" className="text-gray-300 hover:text-white text-sm">
                    Home
                  </a>
                </li>
                <li>
                  <a href="/about" className="text-gray-300 hover:text-white text-sm">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="/dashboard" className="text-gray-300 hover:text-white text-sm">
                    Dashboard
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <a href="/privacy-policy" className="text-gray-300 hover:text-white text-sm">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="/terms-of-service" className="text-gray-300 hover:text-white text-sm">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-700 mt-8 pt-8 text-center">
            <p className="text-gray-300 text-sm">
              © {new Date().getFullYear()} <strong>BANGUN JAYA TRANSINDO</strong>. All rights reserved.
            </p>
            <p className="text-gray-400 text-xs mt-2">
              WhatsApp Business CRM Platform | Powered by Meta WhatsApp Business API
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
