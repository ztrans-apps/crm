import { Metadata } from 'next'
import Link from 'next/link'
import { MessageSquare, Users, BarChart3, Send, Shield, Zap, CheckCircle2, ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'BANGUN JAYA TRANSINDO - WhatsApp Business CRM',
  description: 'Professional WhatsApp Business CRM solution by BANGUN JAYA TRANSINDO',
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-vx-surface via-vx-surface-elevated to-vx-surface">
      {/* Hero Section with Gradient */}
      <section className="relative overflow-hidden">
        {/* Background Gradient Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-vx-purple/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-vx-teal/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center space-y-8 animate-fadeIn">
            {/* Company Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-vx-surface-elevated border border-vx-border rounded-full">
              <div className="w-2 h-2 bg-vx-teal rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-vx-text-secondary">Powered by Meta WhatsApp Business API</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl lg:text-7xl font-bold text-vx-text leading-tight">
              <span className="vx-gradient-text">BANGUN JAYA</span>
              <br />
              <span className="vx-gradient-text">TRANSINDO</span>
            </h1>

            {/* Subheading */}
            <p className="text-xl lg:text-2xl text-vx-text-secondary max-w-3xl mx-auto">
              WhatsApp Business CRM Platform
            </p>

            <p className="text-lg text-vx-text-muted max-w-2xl mx-auto leading-relaxed">
              Kelola percakapan WhatsApp Business, kontak, dan hubungan pelanggan Anda dengan platform CRM yang powerful dan mudah digunakan.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link 
                href="/dashboard"
                className="group inline-flex items-center gap-2 px-8 py-4 bg-vx-purple text-white rounded-xl font-semibold hover:bg-vx-purple-dark transition-all shadow-lg hover:shadow-xl hover:scale-105"
              >
                Mulai Sekarang
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="/about"
                className="inline-flex items-center gap-2 px-8 py-4 bg-vx-surface-elevated border-2 border-vx-border text-vx-text rounded-xl font-semibold hover:bg-vx-surface-hover hover:border-vx-purple transition-all"
              >
                Pelajari Lebih Lanjut
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-8 pt-8 text-sm text-vx-text-muted">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-vx-teal" />
                <span>Secure & Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-vx-teal" />
                <span>24/7 Support</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-vx-teal" />
                <span>Easy Integration</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-vx-surface-elevated/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-vx-text mb-4">
              Fitur Unggulan
            </h2>
            <p className="text-lg text-vx-text-secondary max-w-2xl mx-auto">
              Semua yang Anda butuhkan untuk mengelola komunikasi WhatsApp Business secara profesional
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group bg-vx-surface border border-vx-border rounded-2xl p-8 hover:border-vx-purple hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-vx-purple to-vx-purple-light rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-vx-text mb-3">
                WhatsApp Integration
              </h3>
              <p className="text-vx-text-secondary leading-relaxed">
                Integrasi seamless dengan WhatsApp Business API untuk komunikasi profesional dengan pelanggan Anda.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group bg-vx-surface border border-vx-border rounded-2xl p-8 hover:border-vx-teal hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-vx-teal to-vx-teal-light rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-vx-text mb-3">
                Manajemen Kontak
              </h3>
              <p className="text-vx-text-secondary leading-relaxed">
                Kelola dan organisir kontak pelanggan Anda dengan mudah dalam satu platform terpusat.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group bg-vx-surface border border-vx-border rounded-2xl p-8 hover:border-vx-cyan hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-vx-cyan to-vx-teal-light rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-vx-text mb-3">
                Analytics & Reports
              </h3>
              <p className="text-vx-text-secondary leading-relaxed">
                Pantau performa percakapan, response time, dan metrik engagement pelanggan secara real-time.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group bg-vx-surface border border-vx-border rounded-2xl p-8 hover:border-vx-purple hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-vx-purple to-vx-purple-light rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Send className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-vx-text mb-3">
                Broadcast Messages
              </h3>
              <p className="text-vx-text-secondary leading-relaxed">
                Kirim pesan broadcast yang ditargetkan ke segmen pelanggan Anda dengan mudah dan efisien.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group bg-vx-surface border border-vx-border rounded-2xl p-8 hover:border-vx-teal hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-vx-teal to-vx-teal-light rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-vx-text mb-3">
                Multi-Agent Support
              </h3>
              <p className="text-vx-text-secondary leading-relaxed">
                Kolaborasi dengan tim Anda untuk memberikan layanan pelanggan yang excellent dan responsif.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group bg-vx-surface border border-vx-border rounded-2xl p-8 hover:border-vx-cyan hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-vx-cyan to-vx-teal-light rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-vx-text mb-3">
                Secure & Compliant
              </h3>
              <p className="text-vx-text-secondary leading-relaxed">
                Keamanan enterprise-grade dengan compliance GDPR dan perlindungan data pelanggan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Company Info Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-vx-purple to-vx-teal rounded-3xl p-12 lg:p-16 text-white relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl"></div>
            </div>

            <div className="relative text-center space-y-6">
              <h2 className="text-3xl lg:text-4xl font-bold">
                Tentang BANGUN JAYA TRANSINDO
              </h2>
              <p className="text-lg lg:text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
                Kami adalah perusahaan teknologi yang berspesialisasi dalam solusi WhatsApp Business dan sistem Customer Relationship Management. Misi kami adalah membantu bisnis berkomunikasi secara efektif dengan pelanggan mereka melalui tools yang inovatif dan layanan yang reliable.
              </p>
              <div className="pt-4">
                <Link 
                  href="/about"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white text-vx-purple rounded-xl font-semibold hover:bg-white/90 transition-all shadow-lg hover:shadow-xl"
                >
                  Pelajari Lebih Lanjut
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-vx-surface-elevated/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-vx-text">
            Siap Untuk Memulai?
          </h2>
          <p className="text-lg text-vx-text-secondary max-w-2xl mx-auto">
            Bergabunglah dengan bisnis yang menggunakan BANGUN JAYA TRANSINDO WhatsApp CRM untuk meningkatkan komunikasi dan engagement pelanggan mereka.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/dashboard"
              className="group inline-flex items-center gap-2 px-8 py-4 bg-vx-purple text-white rounded-xl font-semibold hover:bg-vx-purple-dark transition-all shadow-lg hover:shadow-xl hover:scale-105"
            >
              Mulai Sekarang
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href="/about"
              className="inline-flex items-center gap-2 px-8 py-4 bg-vx-surface-elevated border-2 border-vx-border text-vx-text rounded-xl font-semibold hover:bg-vx-surface-hover hover:border-vx-purple transition-all"
            >
              Hubungi Kami
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
