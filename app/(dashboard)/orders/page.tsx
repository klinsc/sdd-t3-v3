import SubstationChat from '@/app/_components/SubstationChat'
import Typography from '@mui/material/Typography'

export default async function OrdersPage() {
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
