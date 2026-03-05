'use client'

import { useParams } from 'next/navigation'
import { ReportEditor } from '@/components/admin/ReportEditor'

export default function ReportEditorPage() {
  const params = useParams()
  const reportId = params.reportId as string

  return <ReportEditor reportId={reportId} />
}
