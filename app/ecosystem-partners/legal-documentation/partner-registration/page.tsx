import PartnerRegistrationFormClient from '../../_components/PartnerRegistrationFormClient'

export const metadata = {
  title: 'Partner Registration | Legal & Documentation | MillionFlats',
  description: 'Apply to become a curated Legal & Documentation Ecosystem Partner on MillionFlats.',
}

export default function LegalPartnerRegistrationPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <PartnerRegistrationFormClient
          title="Partner with MillionFlats: Expand Your Real Estate Legal Practice"
          description="Join our exclusive network of legal experts and connect with a steady stream of clients engaged in active property transactions."
          submitLabel="Submit Application"
          groups={[
            {
              title: 'Firm Details',
              fields: [
                { type: 'text', name: 'fullLegalName', label: 'Full Legal Name', required: true },
                {
                  type: 'select',
                  name: 'practiceType',
                  label: 'Type of Practice',
                  required: true,
                  options: ['Advocate', 'Law Firm', 'Legal Tech Startup'],
                },
                { type: 'url', name: 'websiteOrLinkedIn', label: 'Company Website/LinkedIn', required: true },
                {
                  type: 'number',
                  name: 'yearsSpecialization',
                  label: 'Years of Specialization in Real Estate',
                  required: true,
                },
              ],
            },
            {
              title: 'Contact Information',
              fields: [
                { type: 'text', name: 'primaryContactNameTitle', label: 'Primary Contact Name & Title', required: true },
                { type: 'email', name: 'email', label: 'Email', required: true },
                { type: 'tel', name: 'phone', label: 'Phone Number', required: true },
                {
                  type: 'text',
                  name: 'jurisdictions',
                  label: 'City/States/Jurisdictions of Operation',
                  required: true,
                },
              ],
            },
            {
              title: 'Expertise & Offering',
              fields: [
                {
                  type: 'multiselect',
                  name: 'servicesOffered',
                  label: 'Key Services Offered',
                  required: true,
                  options: ['Due Diligence', 'Agreement Drafting', 'Registration', 'Title Verification', 'NRI Advisory'],
                },
                { type: 'text', name: 'jurisdictionExpertise', label: 'Jurisdictional Expertise (Cities/States)', required: true },
                { type: 'text', name: 'usp', label: 'Unique Selling Proposition', required: true, placeholder: 'e.g., 48-hr Agreement Drafting' },
                {
                  type: 'select',
                  name: 'fixedFeePackages',
                  label: 'Do you offer fixed-fee packages?',
                  required: true,
                  options: ['Yes', 'No'],
                },
              ],
            },
            {
              title: 'Business & Tech Readiness',
              fields: [
                { type: 'textarea', name: 'whyPartner', label: 'Why does your firm want to partner with MillionFlats?', required: true },
                {
                  type: 'select',
                  name: 'usesPracticeSoftware',
                  label: 'Do you use practice management/e-signing software?',
                  required: true,
                  options: ['Yes', 'No'],
                },
                {
                  type: 'text',
                  name: 'avgResponseTime',
                  label: 'Average client response time',
                  required: true,
                  placeholder: 'e.g., within 2 hours',
                },
              ],
            },
            {
              title: 'Uploads',
              fields: [
                { type: 'file', name: 'firmLogo', label: 'Firm Logo', required: true, accept: 'image/*' },
                {
                  type: 'file',
                  name: 'barCouncilLicense',
                  label: 'Bar Council Registration/Relevant License',
                  required: true,
                  accept: 'image/*,application/pdf',
                },
              ],
            },
          ]}
        />
      </div>
    </div>
  )
}
