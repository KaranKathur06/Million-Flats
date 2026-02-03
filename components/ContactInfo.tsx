export default function ContactInfo() {
  return (
    <div className="space-y-6">
      {/* Email */}
      <div className="bg-white rounded-lg p-6 shadow-md">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-dark-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-dark-blue mb-1">Email</h3>
            <p className="text-sm text-gray-600 mb-2">Get in touch via email</p>
            <a href="mailto:support@millionflats.com" className="text-dark-blue hover:underline text-sm">
              support@millionflats.com
            </a>
          </div>

          <div>
            <h3 className="font-semibold text-dark-blue mb-1">Email</h3>
            <p className="text-sm text-gray-600 mb-2">Get in touch via email</p>
            <a href="mailto:sales@millionflats.com" className="text-dark-blue hover:underline text-sm">
              sales@millionflats.com
            </a>
          </div>

          <div>
            <h3 className="font-semibold text-dark-blue mb-1">Email</h3>
            <p className="text-sm text-gray-600 mb-2">Get in touch via email</p>
            <a href="mailto:info@millionflats.com" className="text-dark-blue hover:underline text-sm">
              info@millionflats.com
            </a>
          </div>


        </div>
      </div>

      {/* Phone */}
      <div className="bg-white rounded-lg p-6 shadow-md">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-dark-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-dark-blue mb-1">Phone</h3>
            <p className="text-sm text-gray-600 mb-2">Call us directly</p>
            <a href="tel:+919510155835" className="text-dark-blue hover:underline">
              +91 9510155835
            </a>
          </div>
        </div>
      </div>

      {/* Business Hours */}
      <div className="bg-white rounded-lg p-6 shadow-md">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-dark-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-dark-blue mb-1">Business Hours</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Monday - Friday: 9:00 AM – 6:00 PM EST</p>
              <p>Saturday: 10:00 AM - 4:00 PM EST</p>
              <p>Sunday: Closed</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

