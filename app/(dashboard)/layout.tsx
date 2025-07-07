import { TRPCReactProvider } from '@/trpc/react'
import { DashboardLayout } from '@toolpad/core/DashboardLayout'
import { PageContainer } from '@toolpad/core/PageContainer'
import * as React from 'react'

export default function Layout(props: {
  children: React.ReactNode
}) {
  return (
    <DashboardLayout defaultSidebarCollapsed>
      <PageContainer title="" breadcrumbs={[]}>
        <TRPCReactProvider>{props.children}</TRPCReactProvider>
      </PageContainer>
    </DashboardLayout>
  )
}
