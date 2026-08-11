import type { ProjectFormData, DevOption } from './ProjectFormSchema'
import { PROJECT_COUNTRY_OPTIONS, slugify } from './ProjectFormSchema'

type Props = {
  formData: ProjectFormData
  developers: DevOption[]
  onFieldChange: <K extends keyof ProjectFormData>(field: K, value: ProjectFormData[K]) => void
}

export default function BasicInformation({ formData, developers, onFieldChange }: Props) {
  return null
}
