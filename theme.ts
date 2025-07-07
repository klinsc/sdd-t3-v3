'use client'

import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'data-toolpad-color-scheme',
  },
  colorSchemes: { light: true, dark: false },
  typography: {
    fontFamily: 'Noto Sans Thai, Roboto, sans-serif',
  },
  palette: {
    primary: {
      main: '#74055f',
    },
    secondary: {
      main: '#c99427',
    },
  },
})

export default theme
