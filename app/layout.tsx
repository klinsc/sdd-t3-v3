/* eslint-disable @next/next/no-img-element */
import CorporateFareIcon from '@mui/icons-material/CorporateFare'
import DashboardIcon from '@mui/icons-material/Dashboard'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter'
import { NextAppProvider } from '@toolpad/core/nextjs'
import * as React from 'react'

import type { Navigation } from '@toolpad/core/AppProvider'
import { SessionProvider, signIn, signOut } from 'next-auth/react'
import { Noto_Sans_Thai } from 'next/font/google'
import { auth } from '../auth'
import theme from '../theme'

const notoSansThai = Noto_Sans_Thai({
  subsets: ['thai'],
  weight: ['400', '700'],
})

const NAVIGATION: Navigation = [
  {
    kind: 'header',
    title: 'Main items',
  },
  {
    segment: 'dashboard',
    title: 'Dashboard',
    icon: <DashboardIcon />,
  },
  {
    segment: 'substation',
    title: 'Substations',
    icon: <CorporateFareIcon />,
  },
  {
    kind: 'divider',
  },
]

const BRANDING = {
  logo: (
    <img
      src="/assets/images/electric-factory.png"
      alt="กองออกแบบสถานีไฟฟ้า Substation Design Division"
    />
  ),
  title: 'กองออกแบบสถานีไฟฟ้า',
}

const AUTHENTICATION = {
  signIn,
  signOut,
}

export default async function RootLayout(props: {
  children: React.ReactNode
}) {
  const session = await auth()

  return (
    <html
      lang="en"
      data-toolpad-color-scheme="light"
      suppressHydrationWarning>
      <body className={`${notoSansThai.className}`}>
        <SessionProvider session={session}>
          <AppRouterCacheProvider options={{ enableCssLayer: true }}>
            <NextAppProvider
              navigation={NAVIGATION}
              branding={BRANDING}
              session={session}
              authentication={AUTHENTICATION}
              theme={theme}>
              {props.children}
            </NextAppProvider>
          </AppRouterCacheProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
