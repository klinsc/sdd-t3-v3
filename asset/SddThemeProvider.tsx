import { Box } from '@mui/material'
import * as locales from '@mui/material/locale'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import React from 'react'

// type SupportedLocales = keyof typeof locales

export function SddThemeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  // const [locale, setLocale] =
  //   React.useState<SupportedLocales>('enUS')

  const theme = React.useMemo(
    () =>
      createTheme(
        {
          palette: {
            // mode: 'dark',
          },
          components: {
            // Name of the component
            MuiButtonBase: {
              defaultProps: {
                // The props to change the default for.
                disableRipple: true, // No more ripple, on the whole application 💣!
              },
            },
          },
          typography: {
            fontFamily: [
              'Noto Sans Thai',
              'Roboto',
              '"Helvetica Neue"',
              'Arial',
              'sans-serif',
            ].join(','),
          },
        },
        locales.thTH,
        // locales[locale],
      ),
    [],
    // [locale],
  )

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
        {/* <Autocomplete
          size="small"
          options={['enUS', 'thTH']}
          getOptionLabel={(key) =>
            `${key.substring(0, 2)}-${key.substring(2, 4)}`
          }
          style={{ width: 300 }}
          value={locale}
          disableClearable
          onChange={(event: unknown, newValue: string | null) => {
            setLocale(newValue as SupportedLocales)
          }}
          renderInput={(params) => (
            <TextField {...params} label="Locale" fullWidth />
          )}
        /> */}
      </Box>

      <Box sx={{ width: '100%' }}>{children}</Box>
    </ThemeProvider>
  )
}
