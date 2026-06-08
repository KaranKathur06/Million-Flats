import PartnerRegistrationFormClient from '../../_components/PartnerRegistrationFormClient'

export const metadata = {
  title: 'Partner Registration | Interior Design & Renovation | MillionFlats',
  description: 'Apply to become a curated Interior Design & Renovation Ecosystem Partner on MillionFlats.',
}

export default function InteriorsPartnerRegistrationPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <PartnerRegistrationFormClient
          title="Showcase Your Talent to Homeowners Ready to Invest"
          description="Join MillionFlats' curated network of design professionals and connect with qualified clients actively seeking to renovate, decorate, and transform their spaces."
          category="interior-design-renovation"
          submitLabel="Submit Application"
          groups={[
            {
              title: 'Firm Details',
              fields: [
                { type: 'text', name: 'businessName', label: 'Business/Studio Name', required: true },
                {
                  type: 'select',
                  name: 'firmType',
                  label: 'Type',
                  required: true,
                  options: ['Full-Service Firm', 'Independent Designer', 'Architect-Led', 'Contractor'],
                },
                { type: 'url', name: 'portfolioWebsite', label: 'Portfolio Website', required: true },
                { type: 'number', name: 'yearsInBusiness', label: 'Years in Business', required: true },
              ],
            },
            {
              title: 'Contact Information',
              fields: [
                { type: 'text', name: 'principalName', label: 'Principal Designer/Contact Name', required: true },
                { type: 'text', name: 'title', label: 'Title', required: true },
                { type: 'email', name: 'email', label: 'Email', required: true },
                { type: 'tel', name: 'phone', label: 'Phone', required: true },
                { type: 'text', name: 'serviceCity', label: 'Primary Service City/Region', required: true },
              ],
            },
            {
              title: 'Design Expertise',
              fields: [
                {
                  type: 'multiselect',
                  name: 'designStyles',
                  label: 'Primary Design Styles',
                  required: true,
                  options: ['Modern', 'Traditional', 'Scandinavian', 'Minimal', 'Luxury', 'Industrial'],
                },
                {
                  type: 'multiselect',
                  name: 'services',
                  label: 'Core Services Offered',
                  required: true,
                  options: ['Full Design', 'Renovation', 'Consultation', 'Modular', 'Styling'],
                },
                { type: 'text', name: 'signatureProject', label: 'Signature Project (description & link)', required: true },
                { type: 'text', name: 'budgetRange', label: 'Typical Project Budget Range', required: true },
              ],
            },
            {
              title: 'Business & Process',
              fields: [
                { type: 'textarea', name: 'uniqueApproach', label: 'What makes your design approach unique?', required: true },
                { type: 'text', name: 'software', label: 'Design software used', required: true, placeholder: 'e.g., SketchUp, 3ds Max, AutoCAD' },
                { type: 'select', name: 'visualizations', label: 'Do you provide 3D visualizations?', required: true, options: ['Yes', 'No'] },
                { type: 'text', name: 'timeline', label: 'Typical project timeline', required: true },
              ],
            },
            {
              title: 'Uploads',
              fields: [
                { type: 'file', name: 'studioLogo', label: 'Company/Studio Logo', required: true, accept: 'image/*' },
                {
                  type: 'file',
                  name: 'portfolioPdf',
                  label: 'Portfolio PDF or Link to 3-5 Best Projects',
                  required: false,
                  accept: 'application/pdf,image/*',
                },
              ],
            },
          ]}
        />
      </div>
    </div>
  )
}
