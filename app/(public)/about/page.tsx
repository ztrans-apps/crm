import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Us - BANGUN JAYA TRANSINDO',
  description: 'Learn more about BANGUN JAYA TRANSINDO - Your trusted WhatsApp CRM solution provider',
}

// Force rebuild - Updated: March 9, 2026

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
        {/* Company Banner */}
        <div className="bg-blue-600 text-white text-center py-6 px-4 rounded-lg mb-8">
          <h2 className="text-3xl font-bold mb-2">BANGUN JAYA TRANSINDO</h2>
          <p className="text-blue-100">WhatsApp Business CRM Platform</p>
        </div>

        {/* Company Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            About Us
          </h1>
          <p className="text-xl text-gray-600">
            Your Trusted WhatsApp CRM Solution Provider
          </p>
        </div>

        {/* Company Information */}
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              About Our Company
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>Legal Business Name:</strong> BANGUN JAYA TRANSINDO
            </p>
            <p className="text-gray-700 leading-relaxed">
              BANGUN JAYA TRANSINDO is a technology company specializing in WhatsApp Business 
              solutions and Customer Relationship Management (CRM) systems. We provide innovative 
              tools to help businesses communicate effectively with their customers through 
              WhatsApp Business API.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Our Services
            </h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>WhatsApp Business API Integration</li>
              <li>Customer Relationship Management (CRM)</li>
              <li>Automated Message Broadcasting</li>
              <li>Contact Management</li>
              <li>Conversation Analytics</li>
              <li>Multi-Agent Support</li>
              <li>Real-time Chat Management</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Contact Information
            </h2>
            <div className="space-y-2 text-gray-700">
              <p><strong>Company Name:</strong> BANGUN JAYA TRANSINDO</p>
              <p><strong>Business Type:</strong> Technology Solutions Provider</p>
              <p><strong>Service:</strong> WhatsApp Business CRM Platform</p>
              <p><strong>Phone:</strong> +62 817 906 8111</p>
              <p><strong>Website:</strong> https://voxentra-crm.com</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Our Commitment
            </h2>
            <p className="text-gray-700 leading-relaxed">
              We are committed to providing secure, reliable, and efficient communication 
              solutions for businesses of all sizes. Our platform is built with enterprise-grade 
              security and compliance with data protection regulations.
            </p>
          </section>

          <section className="border-t pt-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Legal & Compliance
            </h2>
            <div className="space-y-2">
              <a 
                href="/privacy-policy" 
                className="text-blue-600 hover:text-blue-800 block"
              >
                Privacy Policy
              </a>
              <a 
                href="/terms-of-service" 
                className="text-blue-600 hover:text-blue-800 block"
              >
                Terms of Service
              </a>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t text-center text-gray-600">
          <p className="font-semibold">BANGUN JAYA TRANSINDO</p>
          <p className="text-sm mt-2">
            © {new Date().getFullYear()} All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
