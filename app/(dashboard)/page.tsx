import Typography from '@mui/material/Typography'
import SubstationChat from '../_components/SubstationChat'

export default async function HomePage() {
  return (
    <>
      <Typography
        variant="h4"
        sx={{ mb: -0.5, fontWeight: 'bold', color: 'primary.main' }}>
        น้องกอฟ (ทดลองใช้)
      </Typography>

      <SubstationChat />
      <Typography variant="body2" color="text.secondary">
        <strong>คำเตือน:</strong> น้องกอฟอาจจะตอบผิดพลาดได้
        กรุณาตรวจสอบข้อมูลก่อนนำไปใช้
        <br />
      </Typography>
    </>
  )
}
