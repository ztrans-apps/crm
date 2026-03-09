import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'BANGUN JAYA TRANSINDO - WhatsApp Business CRM',
  description: 'Professional WhatsApp Business CRM solution by BANGUN JAYA TRANSINDO',
}

// Force rebuild - Updated: March 9, 2026

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            BANGUN JAYA TRANSINDO
          </h1>
          <p className="text-2xl text-gray-600 mb-8">
            WhatsApp Business CRM Platform
          </p>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto mb-12">
            Manage your WhatsApp Business conversations, contacts, and customer relationships 
            with our comprehensive CRM solution. Built for businesses that value efficiency 
            and customer engagement.
          </p>
          
          <div className="flex justify-center space-x-4">
            <Link 
              href="/dashboard"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Get Started
            </Link>
            <Link 
              href="/about"
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold border-2 border-blue-600 hover:bg-blue-50 transition"
            >
              Learn More
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Our Services
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-blue-600 text-4xl mb-4">💬</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              WhatsApp Integration
            </h3>
            <p className="text-gray-600">
              Seamless integration with WhatsApp Business API for professional communication.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-blue-600 text-4xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Contact Management
            </h3>
            <p className="text-gray-600">
              Organize and manage your customer contacts efficiently in one place.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-blue-600 text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Analytics & Reports
            </h3>
            <p className="text-gray-600">
              Track conversations, response times, and customer engagement metrics.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-blue-600 text-4xl mb-4">📢</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Broadcast Messages
            </h3>
            <p className="text-gray-600">
              Send targeted broadcast messages to your customer segments.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-blue-600 text-4xl mb-4">🤝</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Multi-Agent Support
            </h3>
            <p className="text-gray-600">
              Collaborate with your team to provide excellent customer service.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-blue-600 text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Secure & Compliant
            </h3>
            <p className="text-gray-600">
              Enterprise-grade security with GDPR compliance and data protection.
            </p>
          </div>
        </div>
      </div>

      {/* Company Info Section */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              About BANGUN JAYA TRANSINDO
            </h2>
            <p className="text-lg text-gray-700 max-w-3xl mx-auto mb-8">
              We are a technology company specializing in WhatsApp Business solutions and 
              Customer Relationship Management systems. Our mission is to help businesses 
              communicate effectively with their customers through innovative tools and 
              reliable service.
            </p>
            <Link 
              href="/about"
              className="text-blue-600 hover:text-blue-800 font-semibold"
            >
              Learn more about us →
            </Link>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-blue-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join businesses using BANGUN JAYA TRANSINDO WhatsApp CRM
          </p>
          <Link 
            href="/dashboard"
            className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition inline-block"
          >
            Start Now
          </Link>
        </div>
      </div>
    </div>
  )
}
