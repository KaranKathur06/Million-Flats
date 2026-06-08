import PartnerRegistrationFormClient from '../../_components/PartnerRegistrationFormClient'

export const metadata = {
  title: 'Partner Registration | Property Insurance | MillionFlats',
  description: 'Apply to become a curated Property Insurance Ecosystem Partner on MillionFlats.',
}

export default function InsurancePartnerRegistrationPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <PartnerRegistrationFormClient
          title="Partner with MillionFlats: Insure a Growing Market of Property Owners"
          description="Connect your insurance products directly with motivated customers at the point of purchase and ownership on India's intelligent real estate platform."
          category="property-insurance"
          submitLabel="Submit Application"
          groups={[
            {
              title: 'Company Details',
              fields: [
                { type: 'text', name: 'legalCompanyName', label: 'Legal Company Name', required: true },
                {
                  type: 'select',
                  name: 'companyType',
                  label: 'Type',
                  required: true,
                  options: ['General Insurer', 'Life Insurer', 'Insurance Broker', 'Aggregator'],
                },
                { type: 'text', name: 'irdaiRegistrationNumber', label: 'IRDAI Registration Number', required: true },
                { type: 'url', name: 'website', label: 'Website', required: true },
              ],
            },
            {
              title: 'Contact Information',
              fields: [
                { type: 'text', name: 'partnershipManager', label: 'Partnership Manager Name & Title', required: true },
                { type: 'email', name: 'email', label: 'Email', required: true },
                { type: 'tel', name: 'phone', label: 'Phone Number', required: true },
                { type: 'text', name: 'headquartersCity', label: 'Headquarters City', required: true },
              ],
            },
            {
              title: 'Products & Expertise',
              fields: [
                {
                  type: 'multiselect',
                  name: 'products',
                  label: 'Primary Insurance Products Offered',
                  required: true,
                  options: ['Home', 'Fire', 'Burglary', 'Landlord', 'Tenant Contents', 'Builder Risk'],
                },
                { type: 'text', name: 'differentiators', label: 'Key Differentiators', required: true, placeholder: 'e.g., 24/7 Support' },
                { type: 'text', name: 'claimSettlement', label: 'Average Claim Settlement Ratio & Time', required: true },
                {
                  type: 'select',
                  name: 'digitalPolicyManagement',
                  label: 'Do you offer digital policy issuance & management?',
                  required: true,
                  options: ['Yes', 'No'],
                },
              ],
            },
            {
              title: 'Business & Integration',
              fields: [
                { type: 'textarea', name: 'whyPartner', label: 'What interests you about partnering with MillionFlats?', required: true },
                {
                  type: 'select',
                  name: 'quoteApi',
                  label: 'Can you provide a quote API or embeddable application form?',
                  required: true,
                  options: ['Yes', 'No'],
                },
                { type: 'text', name: 'geographiesServed', label: 'Geographies Served', required: true },
              ],
            },
            {
              title: 'Uploads',
              fields: [
                { type: 'file', name: 'companyLogo', label: 'Company Logo (High-res)', required: true, accept: 'image/*' },
                { type: 'file', name: 'irdaiCertificate', label: 'IRDAI Certificate (Optional for initial contact)', required: false, accept: 'image/*,application/pdf' },
              ],
            },
          ]}
        />
      </div>
    </div>
  )
}
