import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Discord from 'next-auth/providers/discord'
import Line from 'next-auth/providers/line'
import type { Provider } from 'next-auth/providers'

const providers: Provider[] = [
  // Credentials({
  //   credentials: {
  //     email: { label: 'Email Address', type: 'email' },
  //     password: { label: 'Password', type: 'password' },
  //   },
  //   authorize(c) {
  //     if (c.password !== 'password') {
  //       return null
  //     }
  //     return {
  //       id: 'test',
  //       name: 'Test User',
  //       email: String(c.email),
  //     }
  //   },
  // }),

  Discord({
    clientId: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
  }),

  // Line({
  //   clientId: process.env.LINE_CLIENT_ID,
  //   clientSecret: process.env.LINE_CLIENT_SECRET,
  // }),
]

if (!process.env.DISCORD_CLIENT_ID) {
  console.warn('Missing environment variable "DISCORD_CLIENT_ID"')
}
if (!process.env.DISCORD_CLIENT_SECRET) {
  console.warn(
    'Missing environment variable "DISCORD_CLIENT_SECRET"',
  )
}
if (!process.env.LINE_CLIENT_ID) {
  console.warn('Missing environment variable "LINE_CLIENT_ID"')
}
if (!process.env.LINE_CLIENT_SECRET) {
  console.warn('Missing environment variable "LINE_CLIENT_SECRET"')
}

export const providerMap = providers.map((provider) => {
  if (typeof provider === 'function') {
    const providerData = provider()
    return { id: providerData.id, name: providerData.name }
  }
  return { id: provider.id, name: provider.name }
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,

  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    authorized({ auth: session, request: { nextUrl } }) {
      const isLoggedIn = !!session?.user
      const isPublicPage = nextUrl.pathname.startsWith('/public')
      const isSubstationPage =
        nextUrl.pathname.startsWith('/substation')

      if (isPublicPage || isLoggedIn || isSubstationPage) {
        return true
      }

      return false // Redirect unauthenticated users to login page
    },
  },
})
