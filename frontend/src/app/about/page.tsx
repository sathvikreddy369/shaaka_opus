export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-heading font-bold mb-8 text-center">
          About Shaaka
        </h1>
        
        <div className="prose prose-lg mx-auto">
          <p className="text-gray-600 text-lg mb-6">
            Shaaka is your trusted destination for premium organic groceries in Hyderabad. 
            We believe that everyone deserves access to pure, chemical-free food that nourishes 
            the body and respects the earth.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Our Mission</h2>
          <p className="text-gray-600 mb-6">
            To make organic food accessible and affordable for every household in Hyderabad, 
            while supporting local farmers who practice sustainable agriculture.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">What We Offer</h2>
          <ul className="list-disc list-inside text-gray-600 space-y-2 mb-6">
            <li>100% certified organic products</li>
            <li>Farm-fresh spices, pulses, honey, and ghee</li>
            <li>Direct sourcing from trusted organic farmers</li>
            <li>Free delivery on orders above ₹500</li>
            <li>Easy returns within 7 days</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Our Promise</h2>
          <p className="text-gray-600 mb-6">
            Every product at Shaaka goes through rigorous quality checks. We work directly 
            with organic farmers across India to ensure you get the freshest and most 
            authentic products. No preservatives, no chemicals – just pure goodness.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Delivery Area</h2>
          <p className="text-gray-600 mb-6">
            We currently deliver within a 25km radius of Hyderabad. We're working hard to 
            expand our delivery area to serve more customers across Telangana.
          </p>
        </div>
      </div>
    </div>
  );
}
