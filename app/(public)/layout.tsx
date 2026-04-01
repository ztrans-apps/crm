// Public layout with company branding
// Updated with Voxentra theme

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-vx-surface">
      {/* Header with Voxentra theme */}
      <header className="sticky top-0 z-50 bg-vx-surface/80 backdrop-blur-lg border-b border-vx-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <a href="/" className="group">
              <h1 className="text-2xl font-bold vx-gradient-text">
                BANGUN JAYA TRANSINDO
              </h1>
              <p className="text-sm text-vx-text-secondary">WhatsApp Business CRM</p>
            </a>
            <nav className="flex items-center space-x-6">
              <a href="/about" className="text-vx-text-secondary hover:text-vx-purple transition-colors font-medium">
                Tentang
              </a>
              <a href="/privacy-policy" className="text-vx-text-secondary hover:text-vx-purple transition-colors font-medium">
                Privacy
              </a>
              <a href="/terms-of-service" className="text-vx-text-secondary hover:text-vx-purple transition-colors font-medium">
                Terms
              </a>
              <a 
                href="/dashboard" 
                className="px-6 py-2 bg-vx-purple text-white rounded-lg font-medium hover:bg-vx-purple-dark transition-all shadow-md hover:shadow-lg"
              >
                Login
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main>{children}</main>

      {/* Footer with Voxentra theme */}
      <footer className="bg-vx-text text-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Company Info */}
            <div>
              <h3 className="text-xl font-bold mb-4 vx-gradient-text">
                BANGUN JAYA TRANSINDO
              </h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Professional WhatsApp Business CRM solution untuk bisnis modern. 
                Kelola percakapan, kontak, dan hubungan pelanggan dengan efisien.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li>
                  <a href="/" className="text-white/70 hover:text-white text-sm transition-colors">
                    Home
                  </a>
                </li>
                <li>
                  <a href="/about" className="text-white/70 hover:text-white text-sm transition-colors">
                    Tentang Kami
                  </a>
                </li>
                <li>
                  <a href="/dashboard" className="text-white/70 hover:text-white text-sm transition-colors">
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
                  <a href="/privacy-policy" className="text-white/70 hover:text-white text-sm transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="/terms-of-service" className="text-white/70 hover:text-white text-sm transition-colors">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-white/10 mt-8 pt-8 text-center">
            <p className="text-white/70 text-sm">
              © {new Date().getFullYear()} <strong className="text-white">BANGUN JAYA TRANSINDO</strong>. All rights reserved.
            </p>
            <p className="text-white/50 text-xs mt-2">
              WhatsApp Business CRM Platform | Powered by Meta WhatsApp Business API
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
