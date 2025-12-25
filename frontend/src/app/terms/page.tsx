import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - Shaaka',
  description: 'Terms of service for Shaaka organic grocery delivery platform',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>
        
        <div className="bg-white rounded-lg shadow p-6 md:p-8 prose prose-green max-w-none">
          <p className="text-gray-600 mb-6">
            Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-600">
              By accessing or using Shaaka&apos;s website and services (&quot;Platform&quot;), you agree to be bound 
              by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, please do not 
              use our Platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Eligibility</h2>
            <p className="text-gray-600">
              You must be at least 18 years old and capable of entering into a legally binding 
              agreement to use our services. By using the Platform, you represent and warrant that 
              you meet these requirements.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Account Registration</h2>
            <ul className="list-disc pl-5 text-gray-600 space-y-2">
              <li>You must provide accurate and complete information during registration</li>
              <li>You are responsible for maintaining the confidentiality of your account</li>
              <li>You agree to notify us immediately of any unauthorized access</li>
              <li>One account per person; sharing accounts is not permitted</li>
              <li>We reserve the right to suspend or terminate accounts for violations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Products and Pricing</h2>
            <ul className="list-disc pl-5 text-gray-600 space-y-2">
              <li>All products are subject to availability</li>
              <li>Prices are displayed in Indian Rupees (INR) and include applicable taxes</li>
              <li>We reserve the right to modify prices without prior notice</li>
              <li>Product images are for illustration; actual products may vary slightly</li>
              <li>We strive for accuracy but do not guarantee error-free listings</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Orders and Payment</h2>
            <h3 className="text-lg font-medium text-gray-800 mb-2">Order Placement</h3>
            <ul className="list-disc pl-5 text-gray-600 space-y-2">
              <li>Orders are subject to acceptance and availability</li>
              <li>We may cancel orders due to pricing errors or stock unavailability</li>
              <li>Order confirmation is sent via SMS/email upon successful placement</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">Payment</h3>
            <ul className="list-disc pl-5 text-gray-600 space-y-2">
              <li>We accept credit/debit cards, UPI, net banking, and Cash on Delivery (COD)</li>
              <li>Online payments are processed securely through Razorpay</li>
              <li>COD orders may have a maximum order limit</li>
              <li>Payment must be made in full before or upon delivery</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Delivery</h2>
            <ul className="list-disc pl-5 text-gray-600 space-y-2">
              <li>Delivery is available within 25km of Hyderabad city center</li>
              <li>Same-day delivery for orders placed before 2:00 PM</li>
              <li>Standard delivery within 24-48 hours</li>
              <li>Delivery charges may apply based on order value and location</li>
              <li>Someone must be present to receive perishable items</li>
              <li>We are not responsible for delays due to factors beyond our control</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Returns and Refunds</h2>
            <h3 className="text-lg font-medium text-gray-800 mb-2">Return Policy</h3>
            <ul className="list-disc pl-5 text-gray-600 space-y-2">
              <li>Report quality issues within 24 hours of delivery</li>
              <li>Provide photos of damaged or unsatisfactory products</li>
              <li>Returns accepted for: damaged, expired, or incorrect items</li>
              <li>Returns not accepted for: change of mind, opened perishables</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">Refund Policy</h3>
            <ul className="list-disc pl-5 text-gray-600 space-y-2">
              <li>Approved refunds processed within 5-7 business days</li>
              <li>Refunds credited to original payment method</li>
              <li>COD orders refunded via bank transfer or store credit</li>
              <li>Partial refunds may be issued for partial returns</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Cancellation</h2>
            <ul className="list-disc pl-5 text-gray-600 space-y-2">
              <li>Orders can be cancelled before dispatch</li>
              <li>Cancel through your account or by contacting support</li>
              <li>Cancellation after dispatch may not be possible</li>
              <li>Full refund for orders cancelled before processing</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">9. User Conduct</h2>
            <p className="text-gray-600">You agree not to:</p>
            <ul className="list-disc pl-5 text-gray-600 space-y-2">
              <li>Use the Platform for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Submit false or misleading information</li>
              <li>Interfere with the Platform&apos;s operation</li>
              <li>Resell products purchased from Shaaka without authorization</li>
              <li>Post harmful, offensive, or inappropriate content</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Intellectual Property</h2>
            <p className="text-gray-600">
              All content on the Platform, including logos, images, text, and software, is the 
              property of Shaaka or its licensors and is protected by intellectual property laws. 
              You may not reproduce, distribute, or create derivative works without our permission.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Disclaimer of Warranties</h2>
            <p className="text-gray-600">
              The Platform is provided &quot;as is&quot; without warranties of any kind. We do not warrant 
              that the Platform will be uninterrupted, secure, or error-free. We are not responsible 
              for any damages arising from your use of the Platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Limitation of Liability</h2>
            <p className="text-gray-600">
              To the maximum extent permitted by law, Shaaka shall not be liable for any indirect, 
              incidental, special, consequential, or punitive damages arising from your use of the 
              Platform or our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">13. Governing Law</h2>
            <p className="text-gray-600">
              These Terms shall be governed by and construed in accordance with the laws of India. 
              Any disputes shall be subject to the exclusive jurisdiction of the courts in Hyderabad, 
              Telangana.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">14. Changes to Terms</h2>
            <p className="text-gray-600">
              We reserve the right to modify these Terms at any time. Changes will be effective upon 
              posting on the Platform. Your continued use constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">15. Contact Information</h2>
            <p className="text-gray-600">
              For questions about these Terms, please contact us:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mt-4">
              <p className="text-gray-700"><strong>Shaaka Organic Groceries</strong></p>
              <p className="text-gray-600">Email: legal@shaaka.com</p>
              <p className="text-gray-600">Phone: +91 98765 43210</p>
              <p className="text-gray-600">Address: Shamshabad, Hyderabad, Telangana - 501218</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
