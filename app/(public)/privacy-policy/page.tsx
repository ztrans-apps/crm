import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy - BANGUN JAYA TRANSINDO',
  description: 'Privacy Policy for BANGUN JAYA TRANSINDO WhatsApp CRM Platform',
}

// Force rebuild - Updated: March 9, 2026

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
        {/* Company Banner */}
        <div className="bg-blue-600 text-white text-center py-6 px-4 rounded-lg mb-8">
          <h2 className="text-3xl font-bold mb-2">BANGUN JAYA TRANSINDO</h2>
          <p className="text-blue-100">WhatsApp Business CRM Platform</p>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Privacy Policy
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Last Updated: {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-700 leading-relaxed">
              BANGUN JAYA TRANSINDO ("we," "our," or "us") is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information 
              when you use our WhatsApp Business CRM platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">2.1 Information You Provide</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Account information (name, email, phone number)</li>
              <li>Business information (company name, business details)</li>
              <li>WhatsApp Business API credentials</li>
              <li>Contact information of your customers</li>
              <li>Messages and conversation data</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">2.2 Automatically Collected Information</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Usage data and analytics</li>
              <li>Device information</li>
              <li>IP address and location data</li>
              <li>Cookies and similar technologies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              We use the collected information for:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Providing and maintaining our CRM services</li>
              <li>Processing WhatsApp messages and conversations</li>
              <li>Managing customer contacts and relationships</li>
              <li>Improving our platform and user experience</li>
              <li>Sending service updates and notifications</li>
              <li>Ensuring security and preventing fraud</li>
              <li>Complying with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Data Sharing and Disclosure</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">4.1 Third-Party Services</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              We may share your information with:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li><strong>Meta/WhatsApp:</strong> For WhatsApp Business API functionality</li>
              <li><strong>Cloud Service Providers:</strong> For hosting and infrastructure (Vercel, Supabase)</li>
              <li><strong>Analytics Providers:</strong> For service improvement</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">4.2 Legal Requirements</h3>
            <p className="text-gray-700 leading-relaxed">
              We may disclose your information if required by law or to protect our rights and safety.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>End-to-end encryption for sensitive data</li>
              <li>Secure data transmission (HTTPS/TLS)</li>
              <li>Regular security audits and monitoring</li>
              <li>Access controls and authentication</li>
              <li>Data backup and disaster recovery</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Retention</h2>
            <p className="text-gray-700 leading-relaxed">
              We retain your data for as long as necessary to provide our services and comply with 
              legal obligations. You may request deletion of your data at any time, subject to legal 
              retention requirements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Your Rights</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              You have the right to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to data processing</li>
              <li>Data portability</li>
              <li>Withdraw consent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Cookies and Tracking</h2>
            <p className="text-gray-700 leading-relaxed">
              We use cookies and similar technologies to enhance your experience, analyze usage, 
              and provide personalized content. You can control cookie preferences through your 
              browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Children's Privacy</h2>
            <p className="text-gray-700 leading-relaxed">
              Our services are not intended for children under 13 years of age. We do not knowingly 
              collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. International Data Transfers</h2>
            <p className="text-gray-700 leading-relaxed">
              Your data may be transferred to and processed in countries other than your own. 
              We ensure appropriate safeguards are in place for such transfers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Changes to This Policy</h2>
            <p className="text-gray-700 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any 
              significant changes by posting the new policy on this page and updating the 
              "Last Updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Contact Us</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              If you have questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700"><strong>Company:</strong> BANGUN JAYA TRANSINDO</p>
              <p className="text-gray-700"><strong>Service:</strong> WhatsApp Business CRM Platform</p>
              <p className="text-gray-700"><strong>Phone:</strong> +62 817 906 8111</p>
              <p className="text-gray-700"><strong>Website:</strong> https://voxentra-crm.com</p>
              <p className="text-gray-700 mt-2">
                For privacy-related inquiries, please contact us through your account dashboard.
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t text-center">
          <p className="text-gray-600 font-semibold">BANGUN JAYA TRANSINDO</p>
          <p className="text-sm text-gray-500 mt-2">
            © {new Date().getFullYear()} All rights reserved.
          </p>
          <div className="mt-4 space-x-4">
            <a href="/about" className="text-blue-600 hover:text-blue-800 text-sm">
              About Us
            </a>
            <a href="/terms-of-service" className="text-blue-600 hover:text-blue-800 text-sm">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
