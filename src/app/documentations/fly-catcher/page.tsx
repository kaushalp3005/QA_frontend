'use client'
import DocListPage from '@/components/documentations/DocListPage'
import { DOC_FORMS } from '@/config/doc-forms'

export default function Page() {
  return <DocListPage config={DOC_FORMS['fly-catcher']} />
}
