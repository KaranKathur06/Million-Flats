import PartnerRegistrationFormClient from '../../_components/PartnerRegistrationFormClient'

export const metadata = {
  title: 'Partner Registration | Home Loans & Finance | MillionFlats',
  description: 'Apply to become a curated Home Loans & Finance Ecosystem Partner on MillionFlats.',
}

export default function HomeLoansFinancePartnerRegistrationPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <PartnerRegistrationFormClient
          title="Partner with MillionFlats & Access High-Intent Home Buyers"
          description="Join our curated ecosystem of trusted finance providers and grow your loan book with qualified, ready-to-transact customers."
          category="home-loans-finance"
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
                  options: ['Public Bank', 'Private Bank', 'NBFC', 'HFC'],
                },
                { type: 'url', name: 'website', label: 'Website', required: true },
                { type: 'number', name: 'yearsInOperation', label: 'Years in Operation', required: true },
              ],
            },
            {
              title: 'Contact Information',
              fields: [
                { type: 'text', name: 'partnerManagerName', label: 'Partner Manager Name', required: true },
                { type: 'text', name: 'jobTitle', label: 'Job Title', required: true },
                { type: 'email', name: 'email', label: 'Email', required: true },
                { type: 'tel', name: 'phone', label: 'Phone Number', required: true },
                { type: 'text', name: 'cityOfOperation', label: 'City of Operation', required: true },
              ],
            },
            {
              title: 'Service & Offer Details',
              fields: [
                {
                  type: 'multiselect',
                  name: 'specializations',
                  label: 'Specializations',
                  required: true,
                  options: ['Salaried', 'Self-Employed', 'NRI', 'First-Time Buyer', 'Balance Transfer'],
                },
                { type: 'text', name: 'competitiveEdge', label: 'Competitive Edge', required: true, placeholder: 'e.g., Fastest Sanction' },
                { type: 'text', name: 'interestRateRange', label: 'Approximate Interest Rate Range', required: true, placeholder: 'e.g., 8.4% - 9.2%' },
              ],
            },
            {
              title: 'Business Intent',
              fields: [
                { type: 'textarea', name: 'whyPartner', label: 'Why do you want to partner with MillionFlats?', required: true },
                { type: 'number', name: 'monthlyLeadExpectation', label: 'Estimated monthly lead expectation', required: true },
              ],
            },
            {
              title: 'Uploads',
              fields: [
                { type: 'file', name: 'companyLogo', label: 'Company Logo (High-res)', required: true, accept: 'image/*' },
                { type: 'file', name: 'license', label: 'Relevant License/Certification (Optional)', required: false, accept: 'image/*,application/pdf' },
              ],
            },
          ]}
        />
      </div>
    </div>
  )
}
