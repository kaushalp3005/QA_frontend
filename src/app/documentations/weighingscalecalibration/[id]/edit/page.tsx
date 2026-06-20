'use client'
import DocEditWrapper from '@/components/documentations/DocEditWrapper'
import { DOC_FORMS } from '@/config/doc-forms'
import { WeighingScaleCalibrationForm } from '@/components/forms/WeighingScaleCalibrationForm'

export default function Page() {
  return <DocEditWrapper config={DOC_FORMS['weighingscalecalibration']} FormComponent={WeighingScaleCalibrationForm} />
}
