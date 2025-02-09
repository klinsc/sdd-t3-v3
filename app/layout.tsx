/* eslint-disable @next/next/no-img-element */
import * as React from 'react'
import { NextAppProvider } from '@toolpad/core/nextjs'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter'
import DashboardIcon from '@mui/icons-material/Dashboard'
import BarChartIcon from '@mui/icons-material/BarChart'
import CorporateFareIcon from '@mui/icons-material/CorporateFare'
import DescriptionIcon from '@mui/icons-material/Description'
import LayersIcon from '@mui/icons-material/Layers'

import type { Navigation } from '@toolpad/core/AppProvider'
import { SessionProvider, signIn, signOut } from 'next-auth/react'
import { auth } from '../auth'
import theme from '../theme'

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
  // {
  //   kind: 'header',
  //   title: 'Analytics',
  // },
  // {
  //   segment: 'reports',
  //   title: 'Reports',
  //   icon: <BarChartIcon />,
  //   children: [
  //     {
  //       segment: 'sales',
  //       title: 'Sales',
  //       icon: <DescriptionIcon />,
  //     },
  //     {
  //       segment: 'traffic',
  //       title: 'Traffic',
  //       icon: <DescriptionIcon />,
  //     },
  //   ],
  // },
  // {
  //   segment: 'integrations',
  //   title: 'Integrations',
  //   icon: <LayersIcon />,
  // },
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
      <body>
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
