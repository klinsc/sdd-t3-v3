// import Typography from '@mui/material/Typography'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  // const session = await auth()

  // redirect to substation page
  redirect('/substation')

  // return (
  //   <Typography>
  //     Welcome to Toolpad, {session?.user?.name || 'User'}!
  //   </Typography>
  // )
}
