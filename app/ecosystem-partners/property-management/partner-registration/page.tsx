import PartnerRegistrationFormClient from '../../_components/PartnerRegistrationFormClient'

export const metadata = {
  title: 'Partner Registration | Property Management | MillionFlats',
  description: 'Apply to become a curated Property Management Ecosystem Partner on MillionFlats.',
}

export default function PropertyManagementPartnerRegistrationPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <PartnerRegistrationFormClient
          title="Partner with MillionFlats: Manage Premium Properties for Discerning Owners"
          description="Expand your portfolio by connecting with property owners—especially NRIs and remote investors—who value professional management and seek trusted partners."
          submitLabel="Submit Application"
          groups={[
            {
              title: 'Firm Details',
              fields: [
                { type: 'text', name: 'legalCompanyName', label: 'Legal Company Name', required: true },
                {
                  type: 'select',
                  name: 'firmType',
                  label: 'Type of Firm',
                  required: true,
                  options: ['Property Management Company', 'Real Estate Agency with PM Division'],
                },
                { type: 'number', name: 'yearsInPm', label: 'Years in Property Management Business', required: true },
                { type: 'url', name: 'website', label: 'Website', required: true },
              ],
            },
            {
              title: 'Contact Information',
              fields: [
                { type: 'text', name: 'bdName', label: 'Business Development/Partnership Manager Name', required: true },
                { type: 'text', name: 'title', label: 'Title', required: true },
                { type: 'email', name: 'email', label: 'Email', required: true },
                { type: 'tel', name: 'phone', label: 'Phone', required: true },
                { type: 'text', name: 'headOfficeCity', label: 'Head Office City', required: true },
              ],
            },
            {
              title: 'Operations & Expertise',
              fields: [
                { type: 'text', name: 'areasOfOperation', label: 'Primary Cities/Areas of Operation', required: true },
                { type: 'text', name: 'unitsManaged', label: 'Types & Number of Units Currently Managed', required: true },
                {
                  type: 'multiselect',
                  name: 'services',
                  label: 'Key Services Offered',
                  required: true,
                  options: ['Tenant Sourcing', 'Rent Collection', 'Maintenance', 'Accounting', 'Inspections'],
                },
                { type: 'text', name: 'feeStructure', label: 'Standard Fee Structure', required: true, placeholder: '% of monthly rent' },
              ],
            },
            {
              title: 'Technology & Reporting',
              fields: [
                { type: 'text', name: 'software', label: 'Property management software/platform used', required: true },
                { type: 'text', name: 'ownerReport', label: 'What does your standard owner report include?', required: true },
                { type: 'select', name: 'ownerPortal', label: 'Do you provide owners with an online portal/dashboard?', required: true, options: ['Yes', 'No'] },
              ],
            },
            {
              title: 'Uploads',
              fields: [
                { type: 'file', name: 'companyLogo', label: 'Company Logo', required: true, accept: 'image/*' },
                { type: 'file', name: 'sampleReport', label: 'Client Testimonial or Sample Owner Report (Optional)', required: false, accept: 'image/*,application/pdf' },
              ],
            },
          ]}
        />
      </div>
    </div>
  )
}
