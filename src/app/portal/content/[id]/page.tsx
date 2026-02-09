import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PortalContentRedirect({ params }: Props) {
  const { id } = await params
  redirect(`/content/review/${id}`)
}
