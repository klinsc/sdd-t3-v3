import { z } from 'zod'

import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'

export const chatRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        incomingMessage: z.string().min(1),
        outgoingMessage: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.chat.create({
        data: {
          incomingMessage: input.incomingMessage,
          outgoingMessage: input.outgoingMessage,
          createdAt: new Date(),
        },
      })

      void ctx.db.$disconnect()

      return
    }),
})
