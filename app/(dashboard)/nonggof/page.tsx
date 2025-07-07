import Typography from '@mui/material/Typography'
import SubstationChat from '../../_components/SubstationChat'
import { Link } from '@mui/material'

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
        <Typography variant="body2" color="text.secondary">
          เรียนรู้เพิ่มเติมเกี่ยวกับน้องกอฟ
        </Typography>
      </Link>

      <br />
      <SubstationChat />

      <Typography variant="body2" color="text.secondary">
        <br />
        <strong>คำเตือน:</strong> น้องกอฟอาจจะตอบผิดพลาดได้
        กรุณาตรวจสอบข้อมูลก่อนนำไปใช้
        <br />
      </Typography>

      <Typography variant="body2" color="text.secondary">
        <strong>ชุดข้อมูลปัจจุบัน:</strong>{' '}
        {`1)สำเนาอนุมัติงานออกแบบสถานีไฟฟ้า✅ 2)คู่มือการออกแบบสถานีไฟฟ้า❌ 3)มาตรการออกแบบสถานีไฟฟ้า❌`}
      </Typography>
    </>
  )
}
