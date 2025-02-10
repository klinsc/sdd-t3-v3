import * as React from 'react'
import Typography from '@mui/material/Typography'
// import { auth } from '../../auth'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  // const session = await auth()

  void redirect('/substation')

  return (
    <Typography>
      {/* Welcome to Toolpad, {session?.user?.name || 'User'}! */}
    </Typography>
  )
}
