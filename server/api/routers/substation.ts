import {
  Area,
  BusArrangement,
  CommunicationTopology,
  StationType,
  type Substation,
  VoltageLevel,
} from '@prisma/client'
import dayjs from 'dayjs'
import fs from 'fs'
import { z } from 'zod'
import {
  substations_20241124,
  substations_20241126,
} from '@/asset/substations'
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from '@/server/api/trpc'

export const substationRouter = createTRPCRouter({
  createOrUpdate: publicProcedure.mutation(async ({ ctx }) => {
    for (const substation of substations_20241126) {
      let newAbbreviation =
        substations_20241124
          .find((s) => s.name === substation.name)
          ?.abbreviation.toUpperCase() ?? substation.abbreviation
      if (!newAbbreviation) {
        console.error('Abbreviation not found', {
          substationName: substation.name,
        })
        throw new Error('Abbreviation not found')
      }

      // read csv file
      const raw = fs.readFileSync(
        'src/asset/substation (19).csv',
        'utf8',
      )
      const data = raw.split(/\r?\n/)
      for (const line of data) {
        const substationData = line.split(',')
        if (
          substationData[1] &&
          substationData[2]?.replace(' ', '') === substation.name
        ) {
          newAbbreviation = substationData[1]
          break
        }
      }

      // use z to validate the abbreviation should be 3 characters without number
      try {
        z.string()
          .length(3)
          .regex(/^[A-Z]+$/)
          .parse(newAbbreviation)
      } catch (error) {
        console.error('Abbreviation is not valid', {
          newAbbreviation,
        })
        throw error
      }

      const newArea = substation.area as Area

      // const newStationType = substation.type as StationType
      let newStationType: StationType = StationType.GISIndoor
      switch (substation.type) {
        case 'AISOutdoor':
          newStationType = StationType.ConventionalOutdoor
          break
        case 'MTSOutdoor':
          newStationType = StationType.MTSOutdoor
          break
        case 'MTSIndoor':
          newStationType = StationType.MTSIndoor
          break
      }

      let newBusArrangement: BusArrangement =
        BusArrangement.HConfiguration
      switch (substation.bus_arrangement) {
        case 'Main&Transfer':
          newBusArrangement = BusArrangement.MainAndTransfer
          break
        case 'Breaker&aHalf':
          newBusArrangement = BusArrangement.BreakerAndAHalf
          break
        case 'DoubleBusSingleBreaker':
          newBusArrangement = BusArrangement.DoubleBusSingleBreaker
          break
      }

      let newVoltageLevel: VoltageLevel = VoltageLevel.kV115
      switch (substation.voltage_level) {
        case '115-22kV':
          newVoltageLevel = VoltageLevel.kV11522
          break
        case '22kv':
          newVoltageLevel = VoltageLevel.kV22
          break
      }

      const newIsTemporary =
        substation.temporary_or_permanent === 'ชั่วคราว'
          ? true
          : false
      const newIsUnmanned =
        substation.manned_or_unmanned === 'Unmanned' ? true : false
      const newAddress = substation.address
      const newDeed = substation.deed_number
      const newLineBayCount = substation.line_bay
      const newTransformerBayCount = substation.transformer_bay
      const newFeederCount = substation.feeder

      let newCommunicationTopo: CommunicationTopology =
        CommunicationTopology.CSCS
      switch (substation.communication_topology) {
        case 'CSCS':
          newCommunicationTopo = CommunicationTopology.CSCS
          break
        case 'SCPS':
          newCommunicationTopo = CommunicationTopology.SCPS
          break
        case 'Topo1':
          newCommunicationTopo = CommunicationTopology.TOPO1
          break
        case 'Topo2':
          newCommunicationTopo = CommunicationTopology.TOPO2
          break
      }

      const newDemolitionCost = substation.demolition_cost
      const newElectricalCost = substation.electrical_cost
      const newCivilCost = substation.civil_cost
      const newSecurityCost = substation.security_cost
      const newTotalCost = substation.total_cost
      const newApprovedDate = dayjs(substation.date).isValid()
        ? dayjs(substation.date).toDate()
        : new Date()

      const newSubstation = {
        name: substation.name.replace(' ', ''),
        abbreviation: newAbbreviation,
        area: newArea,
        stationType: newStationType,
        busArrangement: newBusArrangement,
        voltageLevel: newVoltageLevel,
        isTemporary: newIsTemporary,
        isUnmanned: newIsUnmanned,
        addressId: newAddress,
        deedNumber: newDeed,
        lineBayCount: newLineBayCount,
        transformerBayCount: newTransformerBayCount,
        feederCount: newFeederCount,
        communicationTopology: newCommunicationTopo,
        demolitionCost: newDemolitionCost,
        electricalCost: newElectricalCost,
        civilCost: newCivilCost,
        securityCost: newSecurityCost,
        totalCost: newTotalCost,
        approvalDate: newApprovedDate,
      } as Omit<Substation, 'id' | 'createdAt' | 'updatedAt'>

      console.info('Creating or updating substation', newSubstation)

      // await ctx.db.substation.deleteMany({})

      // await ctx.db.substation.upsert({
      //   where: { name: substation.name },
      //   create: { ...newSubstation },
      //   update: { ...newSubstation, updatedAt: new Date() },
      // })

      const existingSubstation = await ctx.db.substation.findFirst({
        where: { name: substation.name.replace(' ', '') },
      })

      if (existingSubstation) {
        await ctx.db.substation.update({
          where: { id: existingSubstation.id },
          data: newSubstation,
        })
      } else {
        console.info('Creating new substation', newSubstation)

        await ctx.db.substation.create({
          data: newSubstation,
        })
      }
    }
    return
  }),

  getAll: publicProcedure.query(async ({ ctx }) => {
    const substations = await ctx.db.substation.findMany()

    // sort by name in Thai
    substations.sort((a, b) => {
      return a.name.localeCompare(b.name, 'th')
    })

    return substations
  }),

  updateName: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
        isVerified: z.boolean(),
        scannedDocumentUrl: z.string(),
        abbreviation: z.string().min(3).max(3),
        area: z.nativeEnum(Area),
        stationType: z.nativeEnum(StationType),
        busArrangement: z.nativeEnum(BusArrangement),
        isTemporary: z.boolean(),
        isUnmanned: z.boolean(),
        isAddedBay: z.boolean(),
        addressId: z.string(),
        deedNumber: z.string(),
        voltageLevel: z.nativeEnum(VoltageLevel),
        lineBayCount: z.number(),
        transformerBayCount: z.number(),
        feederCount: z.number(),
        communicationTopology: z.nativeEnum(CommunicationTopology),
        demolitionCost: z.number(),
        electricalCost: z.number(),
        civilCost: z.number(),
        securityCost: z.number(),
        totalCost: z.number(),
        latitude: z.number(),
        longitude: z.number(),
        approvalDate: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session
      if (user.email !== 'klinsc.sea@live.com') {
        throw new Error(
          'You are not authorized to perform this action',
        )
      }

      const { id, ...data } = input

      return ctx.db.substation.update({
        where: { id },
        data,
      })
    }),

  updateAbbrv: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        abbreviation: z.string().length(3),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      return ctx.db.substation.update({
        where: { id },
        data,
      })
    }),

  getLatest: protectedProcedure.query(async ({ ctx }) => {
    const post = await ctx.db.post.findFirst({
      orderBy: { createdAt: 'desc' },
      where: { createdBy: { id: ctx.session.user.id } },
    })

    return post ?? null
  }),

  getSecretMessage: protectedProcedure.query(() => {
    return 'you can now see this secret message!'
  }),
})
