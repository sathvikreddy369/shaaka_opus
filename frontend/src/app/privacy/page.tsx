import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - Shaaka',
  description: 'Privacy policy for Shaaka organic grocery delivery platform',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        
        <div className="bg-white rounded-lg shadow p-6 md:p-8 prose prose-green max-w-none">
          <p className="text-gray-600 mb-6">
            Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-600">
              Welcome to Shaaka (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your privacy 
              and personal information. This Privacy Policy explains how we collect, use, disclose, and 
              safeguard your information when you use our website and mobile application (collectively, 
              the &quot;Platform&quot;).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
            <h3 className="text-lg font-medium text-gray-800 mb-2">Personal Information</h3>
            <ul className="list-disc pl-5 text-gray-600 space-y-2">
              <li>Name, email address, and phone number</li>
              <li>Delivery addresses</li>
              <li>Payment information (processed securely through Razorpay)</li>
              <li>Order history and preferences</li>
              <li>Location data (with your consent)</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">Automatically Collected Information</h3>
            <ul className="list-disc pl-5 text-gray-600 space-y-2">
              <li>Device information and identifiers</li>
              <li>Browser type and version</li>
              <li>IP address and general location</li>
              <li>Usage data and browsing patterns</li>
              <li>Cookies and similar technologies</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-600">We use the collected information to:</p>
            <ul className="list-disc pl-5 text-gray-600 space-y-2">
              <li>Process and deliver your orders</li>
              <li>Verify delivery availability in your area</li>
              <li>Send order confirmations and updates via SMS/email</li>
              <li>Process payments securely</li>
              <li>Improve our products and services</li>
              <li>Personalize your shopping experience</li>
              <li>Respond to your inquiries and support requests</li>
              <li>Send promotional communications (with your consent)</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Information Sharing</h2>
            <p className="text-gray-600">We may share your information with:</p>
            <ul className="list-disc pl-5 text-gray-600 space-y-2">
              <li><strong>Delivery Partners:</strong> To fulfill your orders</li>
              <li><strong>Payment Processors:</strong> Razorpay for secure payment processing</li>
              <li><strong>Service Providers:</strong> MSG91 for OTP verification, Cloudinary for image storage</li>
              <li><strong>Legal Authorities:</strong> When required by law</li>
            </ul>
            <p className="text-gray-600 mt-4">
              We do not sell your personal information to third parties.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
            <p className="text-gray-600">
              We implement industry-standard security measures to protect your information:
            </p>
            <ul className="list-disc pl-5 text-gray-600 space-y-2">
              <li>SSL/TLS encryption for all data transmission</li>
              <li>Secure password hashing</li>
              <li>Regular security audits</li>
              <li>Limited access to personal information</li>
              <li>PCI-DSS compliant payment processing through Razorpay</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Your Rights</h2>
            <p className="text-gray-600">You have the right to:</p>
            <ul className="list-disc pl-5 text-gray-600 space-y-2">
              <li>Access your personal information</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Opt-out of marketing communications</li>
              <li>Withdraw consent for location tracking</li>
              <li>Request data portability</li>
            </ul>
            <p className="text-gray-600 mt-4">
              To exercise these rights, contact us at privacy@shaaka.com
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Cookies</h2>
            <p className="text-gray-600">
              We use cookies and similar technologies to enhance your experience. You can manage 
              cookie preferences through your browser settings. Essential cookies are required for 
              the Platform to function properly.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Data Retention</h2>
            <p className="text-gray-600">
              We retain your personal information for as long as your account is active or as needed 
              to provide services. We may retain certain information for legal, accounting, or 
              legitimate business purposes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Children&apos;s Privacy</h2>
            <p className="text-gray-600">
              Our Platform is not intended for children under 18 years of age. We do not knowingly 
              collect personal information from children.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Changes to This Policy</h2>
            <p className="text-gray-600">
              We may update this Privacy Policy from time to time. We will notify you of any material 
              changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Contact Us</h2>
            <p className="text-gray-600">
              If you have questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mt-4">
              <p className="text-gray-700"><strong>Shaaka Organic Groceries</strong></p>
              <p className="text-gray-600">Email: privacy@shaaka.com</p>
              <p className="text-gray-600">Phone: +91 98765 43210</p>
              <p className="text-gray-600">Address: Shamshabad, Hyderabad, Telangana - 501218</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
