// app/page.tsx
import { redirect } from 'next/navigation'

export default function Home() {
  // Redirect to dashboard (will be handled by middleware for auth)
  redirect('/dashboard')
}
