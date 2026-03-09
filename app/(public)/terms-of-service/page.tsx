import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service - BANGUN JAYA TRANSINDO',
  description: 'Terms of Service for BANGUN JAYA TRANSINDO WhatsApp CRM Platform',
}

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Terms of Service
          </h1>
          <p className="text-gray-600">
            BANGUN JAYA TRANSINDO
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Last Updated: {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Agreement to Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              By accessing or using the BANGUN JAYA TRANSINDO WhatsApp Business CRM platform 
              ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you 
              disagree with any part of these terms, you may not access the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              BANGUN JAYA TRANSINDO provides a WhatsApp Business CRM platform that enables 
              businesses to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Manage WhatsApp Business conversations</li>
              <li>Store and organize customer contacts</li>
              <li>Send broadcast messages</li>
              <li>Track conversation analytics</li>
              <li>Manage multiple agents and teams</li>
              <li>Integrate with WhatsApp Business API</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">3.1 Account Creation</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              To use our Service, you must:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Be at least 18 years old or have legal capacity</li>
              <li>Have a valid WhatsApp Business account</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">3.2 Account Responsibility</h3>
            <p className="text-gray-700 leading-relaxed">
              You are responsible for all activities that occur under your account. You must 
              notify us immediately of any unauthorized access or security breach.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Acceptable Use</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">4.1 Permitted Use</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              You may use the Service for:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Legitimate business communications</li>
              <li>Customer relationship management</li>
              <li>Marketing with proper consent</li>
              <li>Customer support and service</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">4.2 Prohibited Use</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              You must NOT use the Service for:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Spam or unsolicited messages</li>
              <li>Illegal activities or content</li>
              <li>Harassment or abusive behavior</li>
              <li>Violating WhatsApp's Terms of Service</li>
              <li>Infringing intellectual property rights</li>
              <li>Distributing malware or viruses</li>
              <li>Attempting to breach security measures</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. WhatsApp Business API Compliance</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              By using our Service, you agree to comply with:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>WhatsApp Business API Terms of Service</li>
              <li>WhatsApp Commerce Policy</li>
              <li>Meta's Platform Terms</li>
              <li>Applicable data protection laws</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data and Privacy</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Your use of the Service is also governed by our Privacy Policy. Key points:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>You retain ownership of your customer data</li>
              <li>We process data as a service provider</li>
              <li>You must have proper consent from your customers</li>
              <li>You are responsible for data accuracy and legality</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Fees and Payment</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">7.1 Service Fees</h3>
            <p className="text-gray-700 leading-relaxed">
              Service fees are based on your subscription plan and usage. All fees are 
              non-refundable unless otherwise stated.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">7.2 WhatsApp Charges</h3>
            <p className="text-gray-700 leading-relaxed">
              WhatsApp Business API charges are separate and billed directly by Meta/WhatsApp. 
              You are responsible for these charges.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Service Availability</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              We strive to provide reliable service, but we do not guarantee:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Uninterrupted or error-free service</li>
              <li>Specific uptime percentages</li>
              <li>Compatibility with all devices or browsers</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              We may perform maintenance, updates, or modifications that temporarily affect service availability.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Intellectual Property</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">9.1 Our Rights</h3>
            <p className="text-gray-700 leading-relaxed">
              The Service, including all content, features, and functionality, is owned by 
              BANGUN JAYA TRANSINDO and protected by intellectual property laws.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">9.2 Your Rights</h3>
            <p className="text-gray-700 leading-relaxed">
              You retain all rights to your customer data and content. By using the Service, 
              you grant us a license to process and store your data to provide the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Termination</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">10.1 By You</h3>
            <p className="text-gray-700 leading-relaxed">
              You may terminate your account at any time through your account settings or by 
              contacting us.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">10.2 By Us</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              We may suspend or terminate your account if:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>You violate these Terms</li>
              <li>You engage in prohibited activities</li>
              <li>Your account is inactive for an extended period</li>
              <li>Required by law or regulation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Disclaimers</h2>
            <p className="text-gray-700 leading-relaxed">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, 
              EITHER EXPRESS OR IMPLIED. WE DISCLAIM ALL WARRANTIES, INCLUDING MERCHANTABILITY, 
              FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Limitation of Liability</h2>
            <p className="text-gray-700 leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, BANGUN JAYA TRANSINDO SHALL NOT BE LIABLE 
              FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY 
              LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Indemnification</h2>
            <p className="text-gray-700 leading-relaxed">
              You agree to indemnify and hold harmless BANGUN JAYA TRANSINDO from any claims, 
              damages, losses, liabilities, and expenses arising from your use of the Service 
              or violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Changes to Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify you of 
              significant changes by email or through the Service. Your continued use of the 
              Service after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Governing Law</h2>
            <p className="text-gray-700 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of 
              Indonesia, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">16. Contact Information</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              For questions about these Terms, please contact us:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700"><strong>Company:</strong> BANGUN JAYA TRANSINDO</p>
              <p className="text-gray-700"><strong>Service:</strong> WhatsApp Business CRM Platform</p>
              <p className="text-gray-700 mt-2">
                For support and inquiries, please contact us through your account dashboard.
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
            <a href="/privacy-policy" className="text-blue-600 hover:text-blue-800 text-sm">
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
