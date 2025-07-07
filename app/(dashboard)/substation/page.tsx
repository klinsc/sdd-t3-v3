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
      <Typography variant="body2" color="text.secondary" mb={2}>
        <strong>หมายเหตุ:</strong>{' '}
        ข้อมูลที่ถูกตรวจสอบแล้วจะมีเครื่องหมาย{' '}
        <span style={{ color: 'green' }}>✅</span>
      </Typography>
      <SubstationTable />
    </div>
  )
}
