import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service - Voxentra CRM',
  description: 'Terms of Service for Voxentra CRM WhatsApp Business Platform',
}

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8 md:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: February 25, 2026</p>

          <div className="prose prose-gray max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">1. Acceptance of Terms</h2>
              <p className="text-gray-600 leading-relaxed">
                By accessing or using Voxentra CRM (&quot;the Service&quot;), you agree to be bound by these 
                Terms of Service. If you do not agree to these terms, please do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">2. Description of Service</h2>
              <p className="text-gray-600 leading-relaxed">
                Voxentra CRM is a customer relationship management platform that integrates with the 
                WhatsApp Business Cloud API to enable businesses to communicate with their customers. 
                Features include messaging, broadcast campaigns, contact management, chatbot automation, 
                and analytics.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">3. User Responsibilities</h2>
              <p className="text-gray-600 leading-relaxed mb-3">By using the Service, you agree to:</p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Comply with all applicable laws and regulations, including data protection laws.</li>
                <li>Comply with Meta&apos;s WhatsApp Business Policy and Commerce Policy.</li>
                <li>Obtain proper consent from recipients before sending WhatsApp messages.</li>
                <li>Not use the Service for spam, harassment, or any illegal purpose.</li>
                <li>Keep your account credentials secure and confidential.</li>
                <li>Provide accurate and up-to-date information.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">4. WhatsApp Business API Usage</h2>
              <p className="text-gray-600 leading-relaxed">
                Use of WhatsApp messaging through our platform is subject to Meta&apos;s policies. 
                You must comply with WhatsApp&apos;s messaging limits, template approval requirements, 
                and opt-in/opt-out regulations. We are not responsible for any restrictions imposed 
                by Meta on your WhatsApp Business Account due to policy violations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">5. Account & Access</h2>
              <p className="text-gray-600 leading-relaxed">
                You are responsible for maintaining the security of your account. You must notify us 
                immediately of any unauthorized use. We reserve the right to suspend or terminate accounts 
                that violate these terms or engage in abusive behavior.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">6. Data & Privacy</h2>
              <p className="text-gray-600 leading-relaxed">
                Your use of the Service is also governed by our{' '}
                <a href="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</a>. 
                You are responsible for ensuring that your use of customer data through our platform 
                complies with applicable privacy laws in your jurisdiction.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">7. Intellectual Property</h2>
              <p className="text-gray-600 leading-relaxed">
                The Service, including its design, features, and content, is owned by Voxentra CRM. 
                You retain ownership of your data. By using the Service, you grant us a limited license 
                to process your data solely for the purpose of providing the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">8. Limitation of Liability</h2>
              <p className="text-gray-600 leading-relaxed">
                The Service is provided &quot;as is&quot; without warranties of any kind. We shall not be 
                liable for any indirect, incidental, or consequential damages arising from your use 
                of the Service. Our total liability shall not exceed the amount paid by you in the 
                preceding 12 months.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">9. Service Availability</h2>
              <p className="text-gray-600 leading-relaxed">
                We strive to maintain high availability but do not guarantee uninterrupted service. 
                We may perform maintenance, updates, or modifications that temporarily affect availability. 
                Message delivery is dependent on Meta&apos;s WhatsApp infrastructure.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">10. Termination</h2>
              <p className="text-gray-600 leading-relaxed">
                Either party may terminate this agreement at any time. Upon termination, your right to 
                use the Service ceases immediately. We will retain your data for a reasonable period 
                to allow data export, after which it will be deleted.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">11. Changes to Terms</h2>
              <p className="text-gray-600 leading-relaxed">
                We reserve the right to modify these terms at any time. Material changes will be 
                communicated via email or through the platform. Continued use of the Service after 
                changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">12. Contact</h2>
              <p className="text-gray-600 leading-relaxed">
                For questions about these Terms of Service, please contact us at:
              </p>
              <p className="text-gray-600 mt-2">
                <strong>Email:</strong> support@voxentra.com<br />
                <strong>Website:</strong> https://voxentra-crm.vercel.app
              </p>
            </section>
          </div>

          <div className="mt-12 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-400 text-center">
              &copy; {new Date().getFullYear()} Voxentra CRM. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
