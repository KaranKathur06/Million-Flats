import PartnerRegistrationFormClient from '../../_components/PartnerRegistrationFormClient'

export const metadata = {
  title: 'Partner Registration | Packers & Movers | MillionFlats',
  description: 'Apply to become a curated Packers & Movers Ecosystem Partner on MillionFlats.',
}

export default function MoversPartnerRegistrationPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <PartnerRegistrationFormClient
          title="Partner with MillionFlats: Move Customers During Life’s Biggest Transitions"
          description="Connect your moving services with homeowners and tenants at the exact moment they secure a new property—through India’s intelligent real estate platform."
          submitLabel="Submit Application"
          groups={[
            {
              title: 'Company Details',
              fields: [
                { type: 'text', name: 'legalBusinessName', label: 'Legal Business Name', required: true },
                { type: 'select', name: 'providerType', label: 'Type of Service Provider', required: true, options: ['Packers & Movers', 'Logistics Company'] },
                { type: 'number', name: 'yearsInOperation', label: 'Years in Operation', required: true },
                { type: 'text', name: 'gstNumber', label: 'GST Number', required: true },
              ],
            },
            {
              title: 'Contact Information',
              fields: [
                { type: 'text', name: 'contactName', label: 'Operations Manager / Partnership Contact Name', required: true },
                { type: 'email', name: 'email', label: 'Email', required: true },
                { type: 'tel', name: 'phone', label: 'Phone Number', required: true },
                { type: 'text', name: 'registeredOfficeCity', label: 'Registered Office City', required: true },
                { type: 'text', name: 'serviceCities', label: 'Primary Service Cities', required: true },
              ],
            },
            {
              title: 'Operations & Capacity',
              fields: [
                {
                  type: 'multiselect',
                  name: 'serviceTypes',
                  label: 'Service Types Offered',
                  required: true,
                  options: ['Local', 'Domestic', 'Packing', 'Storage', 'Car Transport', 'Bike Transport'],
                },
                { type: 'text', name: 'fleetDetails', label: 'Fleet Details (Number & Type of Vehicles)', required: true },
                { type: 'select', name: 'packingMaterials', label: 'Do you provide packing materials & labor?', required: true, options: ['Yes', 'No'] },
                { type: 'text', name: 'insuranceCoverage', label: 'Insurance Coverage Details for goods', required: true, placeholder: 'Sum Insured, Provider' },
              ],
            },
            {
              title: 'Business & Commercials',
              fields: [
                { type: 'text', name: 'pricingModel', label: 'Typical pricing model', required: true, placeholder: 'Per km/kg/volume, package rates' },
                { type: 'text', name: 'differentiator', label: 'Key differentiator', required: true, placeholder: 'e.g., GPS Tracking' },
                { type: 'text', name: 'rating', label: 'Average customer rating on other platforms', required: true },
              ],
            },
            {
              title: 'Uploads',
              fields: [
                { type: 'file', name: 'companyLogo', label: 'Company Logo', required: true, accept: 'image/*' },
                { type: 'file', name: 'licenseCertificate', label: 'Business License/Certificate', required: true, accept: 'image/*,application/pdf' },
                { type: 'file', name: 'insuranceCertificate', label: 'Insurance Certificate Copy', required: true, accept: 'image/*,application/pdf' },
              ],
            },
          ]}
        />
      </div>
    </div>
  )
}
