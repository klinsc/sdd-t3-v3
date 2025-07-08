import Typography from '@mui/material/Typography'
import SubstationChat from '../../_components/SubstationChat'
import { Link, Stack } from '@mui/material'

export default async function HomePage() {
  return (
    <>
      <Typography
        variant="h4"
        sx={{ fontWeight: 'bold', color: 'primary.main' }}>
        🤖น้องกอฟ : เพื่อนคู่ใจงานสถานีไฟฟ้า{' '}
        <span
          style={{ fontSize: '0.8rem', color: 'text.secondary' }}>
          (ทดลองใช้)
        </span>
      </Typography>
      <Link
        href="https://www.canva.com/design/DAGseLlxW_4/Nk977lqAODjQo7MkQKaJWw/view?utm_content=DAGseLlxW_4&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h6c50359962
        "
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: 'none', color: 'inherit' }}>
        <Typography variant="body2" color="text.secondary" ml={1}>
          น้องกอฟเป็นใคร?
        </Typography>
      </Link>

      <br />
      <SubstationChat />

      {/* <Typography variant="body2" color="text.secondary">
        <br />
        <strong>หมายเหตุ:</strong>{' '}
        {`1)น้องกอฟอาจจะตอบผิดพลาดได้ กรุณาตรวจสอบข้อมูลก่อนนำไปใช้ 2)น้องกอฟสามารถตอบได้ทีละคำถามเท่านั้น ยังไม่มีระบบแชทแบบต่อเนื่อง`}
        <br />
      </Typography> */}
      <Stack
        direction="column"
        sx={{ marginTop: 2, marginBottom: 2 }}>
        <Typography variant="body2" color="text.secondary">
          <strong>หมายเหตุ:</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          1) น้องกอฟอาจจะตอบผิดพลาดได้ กรุณาตรวจสอบข้อมูลก่อนนำไปใช้
        </Typography>
        <Typography variant="body2" color="text.secondary">
          2) น้องกอฟสามารถตอบได้ทีละคำถามเท่านั้น
          ยังไม่มีระบบแชทแบบต่อเนื่อง
        </Typography>
        <Typography variant="body2" color="text.secondary">
          3) กอฟ. มีการจัดเก็บข้อมูลที่ผู้ใช้ถามและคำตอบที่น้องกอฟตอบ
          เพื่อใช้ในการพัฒนาปรับปรุงน้องกอฟในอนาคต
        </Typography>
      </Stack>

      {/* <Typography variant="body2" color="text.secondary">
        <strong>ชุดข้อมูลปัจจุบัน:</strong>{' '}
        {`1)สำเนาอนุมัติงานออกแบบสถานีไฟฟ้า✅ 2)คู่มือการออกแบบสถานีไฟฟ้า❌ 3)มาตรการออกแบบสถานีไฟฟ้า❌`}
      </Typography> */}
      <Stack
        direction="column"
        sx={{ marginTop: 2, marginBottom: 2 }}>
        <Typography variant="body2" color="text.secondary">
          <strong>ชุดข้อมูลปัจจุบัน:</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          1) สำเนาอนุมัติงานออกแบบสถานีไฟฟ้า ✅
        </Typography>
        <Typography variant="body2" color="text.secondary">
          2) คู่มือการออกแบบสถานีไฟฟ้า ❌
        </Typography>
        <Typography variant="body2" color="text.secondary">
          3) มาตรการออกแบบสถานีไฟฟ้า ❌
        </Typography>
      </Stack>
    </>
  )
}
