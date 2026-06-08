import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | MillionFlats Pvt Ltd.',
}

export default function PrivacyPolicyPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Privacy Policy',
    dateModified: '2026-02-11',
    datePublished: '2026-02-11',
    author: {
      '@type': 'Organization',
      name: 'MillionFlats Pvt. Ltd.',
    },
    publisher: {
      '@type': 'Organization',
      name: 'MillionFlats Pvt. Ltd.',
    },
  }

  return (
    <div className="min-h-screen bg-white py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-dark-blue">PRIVACY POLICY</h1>
          <p className="mt-2 text-gray-700">MillionFlats Pvt. Ltd.</p>
          <p className="mt-1 text-gray-700">
            Last Updated: <span className="font-medium">11th Feb, 2026</span>
          </p>
          <p className="mt-1 text-gray-700">Jurisdiction: India (Primary) | UAE Operations Covered</p>

          <h2 className="mt-10 text-2xl font-serif font-bold text-dark-blue">1. INTRODUCTION</h2>
          <p className="mt-3 text-gray-700 leading-relaxed">
            MillionFlats Pvt. Ltd. (“Company,” “we,” “us,” or “our”) is a company duly incorporated under the laws of India,
            having its registered office at [Insert Registered Address]. We own and operate the platform MillionFlats
            accessible via website www.millionflats.com and mobile applications (collectively, the “Platform”).
          </p>
          <p className="mt-3 text-gray-700 leading-relaxed">
            This Privacy Policy (“Policy”) explains how we collect, process, store, disclose, and protect your Personal Data
            when you access or use our Platform and services. This Policy complies with the Digital Personal Data Protection
            Act, 2023 (DPDP Act) , the Information Technology Act, 2000, and the rules thereunder .
          </p>
          <p className="mt-3 text-gray-700 leading-relaxed">
            By accessing or using our Platform, you expressly consent to the collection, processing, storage, and disclosure
            of your Personal Data as described in this Policy. If you do not agree with any provision herein, you must
            immediately cease using our Platform.
          </p>

          <h2 className="mt-10 text-2xl font-serif font-bold text-dark-blue">2. DEFINITIONS</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border border-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 border-b border-gray-200">Term</th>
                  <th className="text-left p-3 border-b border-gray-200">Definition</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                <tr>
                  <td className="p-3 border-b border-gray-200">“Platform”</td>
                  <td className="p-3 border-b border-gray-200">
                    means the website www.millionflats.com, mobile applications, APIs, and all related digital services
                    operated by MillionFlats.
                  </td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-200">“Services”</td>
                  <td className="p-3 border-b border-gray-200">
                    means all offerings provided through the Platform, including but not limited to AI-powered property
                    recommendations, immersive 3D tours, Verix Trust Score<sup>™</sup> analytics, agent ProScore<sup>™</sup>{' '}
                    verification, ecosystem partner referrals, and SaaS subscriptions.
                  </td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-200">“User” or “You”</td>
                  <td className="p-3 border-b border-gray-200">
                    means any person who accesses or uses the Platform, including property buyers, sellers, investors, real
                    estate agents, developers, ecosystem partners, and visitors.
                  </td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-200">“Personal Data”</td>
                  <td className="p-3 border-b border-gray-200">
                    means any data about an individual who is identifiable by or in relation to such data, as defined under
                    the DPDP Act, 2023.
                  </td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-200">“Ecosystem Partners”</td>
                  <td className="p-3 border-b border-gray-200">
                    means third-party service providers including home loan providers, legal firms, insurance companies,
                    interior designers, packers and movers, property managers, and Vastu/Feng Shui consultants.
                  </td>
                </tr>
                <tr>
                  <td className="p-3">“Verix AI<sup>™</sup>”</td>
                  <td className="p-3">
                    means our proprietary artificial intelligence system that generates trust scores, property valuations, and
                    investment insights.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="mt-10 text-2xl font-serif font-bold text-dark-blue">3. PERSONAL DATA WE COLLECT</h2>

          <h3 className="mt-6 text-xl font-semibold text-dark-blue">3.1 Information You Provide Directly</h3>
          <p className="mt-3 text-gray-700 leading-relaxed">We collect the following categories of Personal Data when you:</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border border-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 border-b border-gray-200">Category</th>
                  <th className="text-left p-3 border-b border-gray-200">Specific Data Points</th>
                  <th className="text-left p-3 border-b border-gray-200">Purpose</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                <tr>
                  <td className="p-3 border-b border-gray-200">Registration &amp; Profile</td>
                  <td className="p-3 border-b border-gray-200">
                    Name, email address, phone number, password, profile photo, user type (buyer/seller/agent/developer/partner)
                  </td>
                  <td className="p-3 border-b border-gray-200">Account creation, identity verification, personalized experience</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-200">Agent/Developer/Partner Information</td>
                  <td className="p-3 border-b border-gray-200">
                    License numbers, RERA registration details, business registration certificates, years of experience,
                    specialization areas, portfolio links
                  </td>
                  <td className="p-3 border-b border-gray-200">
                    Verification for VerixPro<sup>™</sup> scoring, platform trust building
                  </td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-200">Property Information</td>
                  <td className="p-3 border-b border-gray-200">
                    Property address, ownership documents, photographs, floor plans, pricing details
                  </td>
                  <td className="p-3 border-b border-gray-200">Listing creation, 3D tour generation, AI valuation</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-200">Financial Information</td>
                  <td className="p-3 border-b border-gray-200">
                    Bank account details (for subscription payments), transaction history
                  </td>
                  <td className="p-3 border-b border-gray-200">Payment processing, subscription management</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-200">Ecosystem Partner Onboarding</td>
                  <td className="p-3 border-b border-gray-200">
                    Company registration, contact details, service categories, certifications, fee structures
                  </td>
                  <td className="p-3 border-b border-gray-200">Partner verification, user matching</td>
                </tr>
                <tr>
                  <td className="p-3">Communications</td>
                  <td className="p-3">Queries, feedback, support requests, chat history</td>
                  <td className="p-3">Customer support, service improvement</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="mt-6 text-xl font-semibold text-dark-blue">3.2 Information Collected Automatically</h3>
          <div className="mt-3 text-gray-700 leading-relaxed space-y-2">
            <p>
              <span className="font-medium">Usage Data:</span> Pages visited, features used, time spent, clicks, searches,
              properties viewed, 3D tour interactions
            </p>
            <p>
              <span className="font-medium">Device Information:</span> IP address, browser type, operating system, device
              identifiers
            </p>
            <p>
              <span className="font-medium">Location Data:</span> Approximate location based on IP address; precise location
              only with explicit consent
            </p>
            <p>
              <span className="font-medium">Cookies &amp; Tracking Technologies:</span> We use cookies, pixels, and similar
              technologies for analytics, personalization, and advertising
            </p>
          </div>

          <h3 className="mt-6 text-xl font-semibold text-dark-blue">3.3 Information from Third Parties</h3>
          <div className="mt-3 text-gray-700 leading-relaxed space-y-2">
            <p>
              <span className="font-medium">Verix AI Data:</span> Our AI generates insights, trust scores, and valuations
              based on your platform activity and publicly available data
            </p>
            <p>
              <span className="font-medium">Ecosystem Partners:</span> We may receive confirmation of service delivery, lead
              status, and transaction updates from partners
            </p>
            <p>
              <span className="font-medium">Social Media:</span> If you interact with our social media pages, we may receive
              publicly available profile information
            </p>
          </div>

          <h2 className="mt-10 text-2xl font-serif font-bold text-dark-blue">4. HOW WE USE YOUR PERSONAL DATA</h2>
          <p className="mt-3 text-gray-700 leading-relaxed">We use your Personal Data only for the following legitimate purposes:</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border border-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 border-b border-gray-200">Purpose</th>
                  <th className="text-left p-3 border-b border-gray-200">Legal Basis (DPDP Act)</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                <tr>
                  <td className="p-3 border-b border-gray-200">
                    To provide and deliver our Services, including AI-powered property matching, 3D tours, and trust scores
                  </td>
                  <td className="p-3 border-b border-gray-200">Performance of contract</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-200">To verify agent and developer credentials for VerixPro<sup>™</sup> scoring</td>
                  <td className="p-3 border-b border-gray-200">Consent and legitimate interest</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-200">
                    To connect you with ecosystem partners (loans, legal, insurance, etc.) based on your expressed interest
                  </td>
                  <td className="p-3 border-b border-gray-200">Consent</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-200">To process subscription payments and manage your account</td>
                  <td className="p-3 border-b border-gray-200">Performance of contract</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-200">
                    To communicate with you regarding service updates, inquiries, and transaction-related information
                  </td>
                  <td className="p-3 border-b border-gray-200">Performance of contract</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-200">
                    To send marketing and promotional communications about properties, services, and offers (with opt-out option)
                  </td>
                  <td className="p-3 border-b border-gray-200">Consent</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-200">To improve our AI algorithms, Platform functionality, and user experience</td>
                  <td className="p-3 border-b border-gray-200">Legitimate interest</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-200">To comply with legal obligations and respond to lawful requests from government authorities</td>
                  <td className="p-3 border-b border-gray-200">Legal obligation</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-200">To detect, prevent, and address technical or security issues</td>
                  <td className="p-3 border-b border-gray-200">Legitimate interest</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-gray-700 leading-relaxed">
            Cross-Border Data Transfer: As we operate in India and the UAE, your Personal Data may be transferred to and
            processed in the UAE. By using our Platform, you consent to such cross-border transfer in compliance with the
            DPDP Act, 2023 .
          </p>

          <h2 className="mt-10 text-2xl font-serif font-bold text-dark-blue">5. DISCLOSURE AND SHARING OF PERSONAL DATA</h2>
          <p className="mt-3 text-gray-700 leading-relaxed">
            We do not sell your Personal Data. We may share your information only in the following circumstances:
          </p>

          <h3 className="mt-6 text-xl font-semibold text-dark-blue">5.1 Within the MillionFlats Ecosystem</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border border-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 border-b border-gray-200">Recipient</th>
                  <th className="text-left p-3 border-b border-gray-200">Circumstance</th>
                  <th className="text-left p-3 border-b border-gray-200">Data Shared</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                <tr>
                  <td className="p-3 border-b border-gray-200">Real Estate Agents &amp; Developers</td>
                  <td className="p-3 border-b border-gray-200">When you express interest in a property listing</td>
                  <td className="p-3 border-b border-gray-200">Your name, contact information, inquiry details</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-200">Ecosystem Partners</td>
                  <td className="p-3 border-b border-gray-200">When you request a specific service (loan, legal, interior design, etc.)</td>
                  <td className="p-3 border-b border-gray-200">Your name, contact details, property/service requirements</td>
                </tr>
                <tr>
                  <td className="p-3">Other Users</td>
                  <td className="p-3">For transactions you initiate (e.g., seller to buyer)</td>
                  <td className="p-3">As necessary to complete the transaction</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="mt-6 text-xl font-semibold text-dark-blue">5.2 Third-Party Service Providers</h3>
          <p className="mt-3 text-gray-700 leading-relaxed">We engage trusted third parties to assist in operating our Platform:</p>
          <div className="mt-3 text-gray-700 leading-relaxed space-y-1">
            <p>Cloud Infrastructure: Hosting providers in India and UAE</p>
            <p>Payment Processors: For secure subscription payment processing</p>
            <p>Analytics Providers: Google Analytics, Meta Pixel, LinkedIn Insights</p>
            <p>Customer Support Tools: For managing communications</p>
            <p>AI/ML Service Providers: For enhancing our Verix AI capabilities</p>
          </div>
          <p className="mt-3 text-gray-700 leading-relaxed">
            All such providers are contractually bound to process data only on our instructions and in compliance with
            applicable data protection laws.
          </p>

          <h3 className="mt-6 text-xl font-semibold text-dark-blue">5.3 Legal Obligations</h3>
          <p className="mt-3 text-gray-700 leading-relaxed">We may disclose your Personal Data if required to:</p>
          <div className="mt-3 text-gray-700 leading-relaxed space-y-1">
            <p>Comply with any valid legal process, government request, or applicable law</p>
            <p>Enforce our Terms &amp; Conditions</p>
            <p>Protect the rights, property, or safety of MillionFlats, our users, or the public</p>
          </div>

          <h3 className="mt-6 text-xl font-semibold text-dark-blue">5.4 Business Transfers</h3>
          <p className="mt-3 text-gray-700 leading-relaxed">
            In the event of a merger, acquisition, financing, or sale of assets, your Personal Data may be transferred as a
            business asset. We will notify you of any such change of ownership or control.
          </p>

          <h2 className="mt-10 text-2xl font-serif font-bold text-dark-blue">6. YOUR RIGHTS AND CHOICES</h2>
          <p className="mt-3 text-gray-700 leading-relaxed">
            Under the DPDP Act, 2023 and other applicable laws, you have the following rights:
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border border-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 border-b border-gray-200">Right</th>
                  <th className="text-left p-3 border-b border-gray-200">Description</th>
                  <th className="text-left p-3 border-b border-gray-200">How to Exercise</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                <tr>
                  <td className="p-3 border-b border-gray-200">Right to Access</td>
                  <td className="p-3 border-b border-gray-200">
                    Request confirmation of whether we process your Personal Data and obtain a copy
                  </td>
                  <td className="p-3 border-b border-gray-200">Email grievance officer</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-200">Right to Correction</td>
                  <td className="p-3 border-b border-gray-200">Request correction of inaccurate or incomplete Personal Data</td>
                  <td className="p-3 border-b border-gray-200">Update via account settings or email</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-200">Right to Erasure</td>
                  <td className="p-3 border-b border-gray-200">
                    Request deletion of your Personal Data, subject to legal retention requirements
                  </td>
                  <td className="p-3 border-b border-gray-200">Email grievance officer</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-200">Right to Withdraw Consent</td>
                  <td className="p-3 border-b border-gray-200">Withdraw consent for non-essential processing (e.g., marketing)</td>
                  <td className="p-3 border-b border-gray-200">Unsubscribe link or email</td>
                </tr>
                <tr>
                  <td className="p-3">Right to Grievance Redressal</td>
                  <td className="p-3">Lodge complaints regarding data processing</td>
                  <td className="p-3">Contact grievance officer</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-gray-700 leading-relaxed">
            Response Time: We will respond to all legitimate requests within 15 days of receipt, as mandated under Indian law .
          </p>
          <p className="mt-3 text-gray-700 leading-relaxed">
            Opt-Out of Marketing Communications: You may unsubscribe from promotional emails by clicking the “unsubscribe” link
            in any such communication, or by contacting us directly.
          </p>

          <h2 className="mt-10 text-2xl font-serif font-bold text-dark-blue">7. DATA RETENTION</h2>
          <p className="mt-3 text-gray-700 leading-relaxed">
            We retain your Personal Data only for as long as necessary to fulfill the purposes for which it was collected,
            including:
          </p>
          <div className="mt-3 text-gray-700 leading-relaxed space-y-1">
            <p>As long as your account is active</p>
            <p>To provide you with Services</p>
            <p>To comply with legal obligations (e.g., tax, audit, anti-money laundering laws)</p>
            <p>To resolve disputes and enforce our agreements</p>
          </div>
          <p className="mt-3 text-gray-700 leading-relaxed">
            When Personal Data is no longer required, we securely delete or anonymize it.
          </p>

          <h2 className="mt-10 text-2xl font-serif font-bold text-dark-blue">8. DATA SECURITY</h2>
          <p className="mt-3 text-gray-700 leading-relaxed">
            We implement reasonable and appropriate technical and organizational security measures to protect your Personal Data
            against unauthorized access, alteration, disclosure, or destruction. These include:
          </p>
          <div className="mt-3 text-gray-700 leading-relaxed space-y-1">
            <p>Encryption: SSL/TLS encryption for data in transit</p>
            <p>Access Controls: Role-based access restrictions for employees and contractors</p>
            <p>Regular Audits: Periodic security assessments</p>
            <p>Secure Storage: Data stored on secure servers with firewall protection</p>
          </div>
          <p className="mt-3 text-gray-700 leading-relaxed">
            However, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee
            absolute security, but we take all reasonable precautions to protect your information.
          </p>

          <h2 className="mt-10 text-2xl font-serif font-bold text-dark-blue">9. CHILDREN&apos;S PRIVACY</h2>
          <p className="mt-3 text-gray-700 leading-relaxed">
            Our Platform is not intended for individuals under the age of 18. We do not knowingly collect Personal Data from
            minors. If we become aware that a minor has provided us with Personal Data, we will take steps to delete such
            information.
          </p>

          <h2 className="mt-10 text-2xl font-serif font-bold text-dark-blue">10. THIRD-PARTY LINKS</h2>
          <p className="mt-3 text-gray-700 leading-relaxed">
            Our Platform may contain links to third-party websites, including those of our ecosystem partners, advertisers, and
            social media platforms. This Privacy Policy does not apply to such third-party sites. We encourage you to review the
            privacy policies of any third-party websites you visit .
          </p>

          <h2 className="mt-10 text-2xl font-serif font-bold text-dark-blue">11. COOKIES AND TRACKING TECHNOLOGIES</h2>
          <p className="mt-3 text-gray-700 leading-relaxed">We use cookies and similar tracking technologies to:</p>
          <div className="mt-3 text-gray-700 leading-relaxed space-y-1">
            <p>Recognize you when you return to our Platform</p>
            <p>Remember your preferences and settings</p>
            <p>Analyze how you interact with our Platform</p>
            <p>Deliver relevant advertising</p>
          </div>
          <p className="mt-3 text-gray-700 leading-relaxed">
            Your Choices: Most web browsers allow you to control cookies through their settings. Disabling cookies may affect
            your ability to use certain features of our Platform .
          </p>

          <h2 className="mt-10 text-2xl font-serif font-bold text-dark-blue">12. INTERNATIONAL USERS</h2>
          <p className="mt-3 text-gray-700 leading-relaxed">
            Our Platform is primarily intended for users in India and the UAE. If you access our Platform from outside these
            jurisdictions, you do so at your own initiative and are responsible for compliance with local laws. By providing your
            Personal Data, you consent to its transfer, storage, and processing in India and the UAE.
          </p>

          <h2 className="mt-10 text-2xl font-serif font-bold text-dark-blue">13. CHANGES TO THIS PRIVACY POLICY</h2>
          <p className="mt-3 text-gray-700 leading-relaxed">
            We may update this Privacy Policy from time to time to reflect changes in our practices, legal requirements, or
            operational needs. The updated version will be posted on this page with a revised “Last Updated” date. If we make
            material changes, we will notify you via email or a prominent notice on our Platform prior to the change becoming
            effective .
          </p>
          <p className="mt-3 text-gray-700 leading-relaxed">
            Your continued use of the Platform after such updates constitutes your acceptance of the revised Policy.
          </p>

          <h2 className="mt-10 text-2xl font-serif font-bold text-dark-blue">14. GRIEVANCE REDRESSAL AND CONTACT INFORMATION</h2>
          <p className="mt-3 text-gray-700 leading-relaxed">
            If you have any questions, concerns, or complaints regarding this Privacy Policy or our data handling practices,
            please contact our Grievance Officer:
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border border-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 border-b border-gray-200">Designation</th>
                  <th className="text-left p-3 border-b border-gray-200">Details</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                <tr>
                  <td className="p-3 border-b border-gray-200">Name</td>
                  <td className="p-3 border-b border-gray-200">Tarique Mansuri</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-200">Designation</td>
                  <td className="p-3 border-b border-gray-200">CEO</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-200">Email</td>
                  <td className="p-3 border-b border-gray-200">info@millionflats.com</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-200">Address</td>
                  <td className="p-3 border-b border-gray-200">Rajkot, 360005, Gujarat, India</td>
                </tr>
                <tr>
                  <td className="p-3">Response Commitment</td>
                  <td className="p-3">Acknowledgment within 24 hours; resolution within 15 days</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-6 text-gray-700 leading-relaxed">For general inquiries: info@millionflats.com</p>
        </article>
      </div>
    </div>
  )
}
