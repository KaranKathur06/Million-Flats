import PartnerRegistrationFormClient from '../../_components/PartnerRegistrationFormClient'

export const metadata = {
  title: 'Partner Registration | Vastu / Feng Shui | MillionFlats',
  description: 'Apply to become a curated Vastu / Feng Shui Ecosystem Partner on MillionFlats.',
}

export default function VastuPartnerRegistrationPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <PartnerRegistrationFormClient
          title="Partner with MillionFlats: Guide Clients in Creating Harmonious Spaces"
          description="Join our curated network of wellness consultants and connect with homeowners and investors who seek authentic Vastu or Feng Shui expertise as part of their property journey."
          submitLabel="Submit Application"
          groups={[
            {
              title: 'Practitioner Details',
              fields: [
                { type: 'text', name: 'fullName', label: 'Full Name', required: true },
                { type: 'text', name: 'businessName', label: 'Consultancy/Business Name', required: true },
                {
                  type: 'select',
                  name: 'discipline',
                  label: 'Primary Discipline',
                  required: true,
                  options: ['Vastu Shastra', 'Feng Shui'],
                },
                { type: 'number', name: 'yearsPractice', label: 'Years of Professional Practice', required: true },
              ],
            },
            {
              title: 'Contact Information',
              fields: [
                { type: 'email', name: 'email', label: 'Email', required: true },
                { type: 'tel', name: 'phone', label: 'Phone Number', required: true },
                { type: 'text', name: 'city', label: 'City/Region of Operation', required: true },
                { type: 'text', name: 'languages', label: 'Languages Spoken', required: true },
              ],
            },
            {
              title: 'Consultation Practice',
              fields: [
                {
                  type: 'multiselect',
                  name: 'services',
                  label: 'Services Offered',
                  required: true,
                  options: ['Pre-Purchase Audit', 'Home Evaluation', 'Commercial', 'Floor Plan Analysis', 'Remediation Advice'],
                },
                { type: 'select', name: 'mode', label: 'Consultation Mode', required: true, options: ['In-Person', 'Virtual', 'Both'] },
                { type: 'text', name: 'feeRange', label: 'Typical Consultation Package & Fee Range', required: true },
                { type: 'file', name: 'sampleReport', label: 'Sample Consultation Report (Optional)', required: false, accept: 'application/pdf,image/*' },
              ],
            },
            {
              title: 'Philosophy & Approach',
              fields: [
                { type: 'textarea', name: 'philosophy', label: 'Briefly describe your consultation philosophy and approach.', required: true },
                { type: 'textarea', name: 'modernAdaptation', label: 'How do you adapt traditional principles to modern homes/apartments?', required: true },
              ],
            },
            {
              title: 'Uploads',
              fields: [
                { type: 'file', name: 'photoOrLogo', label: 'Professional Photo or Logo', required: true, accept: 'image/*' },
                { type: 'url', name: 'website', label: 'Website/Social Profile (Optional)', required: false },
              ],
            },
          ]}
        />
      </div>
    </div>
  )
}
