import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy - Voxentra CRM',
  description: 'Privacy Policy for Voxentra CRM WhatsApp Business Platform',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-vx-surface-elevated">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-vx-surface rounded-lg shadow-sm p-8 md:p-12">
          <h1 className="text-3xl font-bold text-vx-text mb-2">Privacy Policy</h1>
          <p className="text-sm text-vx-text-muted mb-8">Last updated: February 25, 2026</p>

          <div className="prose prose-gray max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-vx-text mt-8 mb-3">1. Introduction</h2>
              <p className="text-vx-text-secondary leading-relaxed">
                Voxentra CRM (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information 
                when you use our customer relationship management platform integrated with WhatsApp Business API.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vx-text mt-8 mb-3">2. Information We Collect</h2>
              <p className="text-vx-text-secondary leading-relaxed mb-3">We may collect the following types of information:</p>
              <ul className="list-disc pl-6 text-vx-text-secondary space-y-2">
                <li><strong>Account Information:</strong> Name, email address, phone number, and organization details when you register.</li>
                <li><strong>WhatsApp Messages:</strong> Message content, media files, and metadata exchanged through the WhatsApp Business API for customer communication purposes.</li>
                <li><strong>Contact Data:</strong> Customer phone numbers, names, and conversation history stored in the CRM.</li>
                <li><strong>Usage Data:</strong> Log data, device information, and analytics about how you interact with our platform.</li>
                <li><strong>Broadcast Data:</strong> Campaign details, recipient lists, and delivery status for broadcast messages.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vx-text mt-8 mb-3">3. How We Use Your Information</h2>
              <p className="text-vx-text-secondary leading-relaxed mb-3">We use the collected information to:</p>
              <ul className="list-disc pl-6 text-vx-text-secondary space-y-2">
                <li>Provide and maintain our CRM and WhatsApp messaging services.</li>
                <li>Process and deliver WhatsApp messages between you and your customers.</li>
                <li>Manage broadcast campaigns and message templates.</li>
                <li>Generate analytics and reports on messaging performance.</li>
                <li>Improve and optimize our platform.</li>
                <li>Provide customer support.</li>
                <li>Comply with legal obligations.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vx-text mt-8 mb-3">4. WhatsApp Business API</h2>
              <p className="text-vx-text-secondary leading-relaxed">
                Our platform integrates with the Meta WhatsApp Business Cloud API. Messages sent and received 
                through WhatsApp are processed according to Meta&apos;s WhatsApp Business Policy and 
                Commerce Policy. We act as a Business Solution Provider (BSP) and comply with 
                Meta&apos;s data handling requirements. WhatsApp message data is used solely for the purpose 
                of facilitating communication between you and your customers.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vx-text mt-8 mb-3">5. Data Storage & Security</h2>
              <p className="text-vx-text-secondary leading-relaxed">
                Your data is stored securely using Supabase (PostgreSQL) with Row Level Security (RLS) 
                enabled for multi-tenant data isolation. We implement industry-standard security measures 
                including encryption in transit (TLS/SSL), secure authentication, and access controls to 
                protect your information from unauthorized access, alteration, or destruction.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vx-text mt-8 mb-3">6. Data Sharing</h2>
              <p className="text-vx-text-secondary leading-relaxed mb-3">
                We do not sell your personal information. We may share data with:
              </p>
              <ul className="list-disc pl-6 text-vx-text-secondary space-y-2">
                <li><strong>Meta (WhatsApp):</strong> Message data is transmitted through Meta&apos;s WhatsApp Business API for message delivery.</li>
                <li><strong>Service Providers:</strong> Third-party services that help us operate our platform (hosting, database, analytics).</li>
                <li><strong>Legal Requirements:</strong> When required by law, regulation, or legal process.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vx-text mt-8 mb-3">7. Data Retention</h2>
              <p className="text-vx-text-secondary leading-relaxed">
                We retain your data for as long as your account is active or as needed to provide services. 
                Message history and conversation data are retained based on your organization&apos;s settings. 
                You may request deletion of your data at any time by contacting us.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vx-text mt-8 mb-3">8. Your Rights</h2>
              <p className="text-vx-text-secondary leading-relaxed mb-3">You have the right to:</p>
              <ul className="list-disc pl-6 text-vx-text-secondary space-y-2">
                <li>Access and receive a copy of your personal data.</li>
                <li>Request correction of inaccurate data.</li>
                <li>Request deletion of your data.</li>
                <li>Object to or restrict the processing of your data.</li>
                <li>Data portability — receive your data in a structured format.</li>
                <li>Withdraw consent at any time.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vx-text mt-8 mb-3">9. Cookies</h2>
              <p className="text-vx-text-secondary leading-relaxed">
                We use essential cookies for authentication and session management. 
                No third-party tracking cookies are used without your consent.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vx-text mt-8 mb-3">10. Changes to This Policy</h2>
              <p className="text-vx-text-secondary leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any material 
                changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-vx-text mt-8 mb-3">11. Contact Us</h2>
              <p className="text-vx-text-secondary leading-relaxed">
                If you have any questions about this Privacy Policy, please contact us at:
              </p>
              <p className="text-vx-text-secondary mt-2">
                <strong>Email:</strong> privacy@voxentra.com<br />
                <strong>Website:</strong> https://voxentra-crm.vercel.app
              </p>
            </section>
          </div>

          <div className="mt-12 pt-6 border-t border-vx-border">
            <p className="text-sm text-vx-text-muted text-center">
              &copy; {new Date().getFullYear()} Voxentra CRM. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
