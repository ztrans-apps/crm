// app/page.tsx
import { redirect } from 'next/navigation'

export default function Home() {
  // Let middleware handle the redirect
  redirect('/login')
}
