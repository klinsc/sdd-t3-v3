'use client'

import { Typography } from '@mui/material'
import SubstationTable from '~/_components/SubstationTable'

export default function SubstationsPage() {
  return (
    <div>
      <Typography
        variant="h4"
        sx={{ fontWeight: 'bold', color: 'primary.main' }}>
        สำเนาอนุมัติงานออกแบบสถานีไฟฟ้า{' '}
        <span
          style={{ fontSize: '0.8rem', color: 'text.secondary' }}>
          (ทดลองใช้)
        </span>
      </Typography>
      <SubstationTable />
    </div>
  )
}
