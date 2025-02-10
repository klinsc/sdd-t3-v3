/* eslint-disable @next/next/no-img-element */
'use client'

import { api } from '@/trpc/react'
import AddIcon from '@mui/icons-material/Add'
import CancelIcon from '@mui/icons-material/Close'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import EditIcon from '@mui/icons-material/Edit'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import SaveIcon from '@mui/icons-material/Save'
import { IconButton } from '@mui/material'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import {
  DataGrid,
  GridActionsCellItem,
  type GridColDef,
  type GridEventListener,
  GridRowEditStopReasons,
  type GridRowId,
  type GridRowModel,
  GridRowModes,
  type GridRowModesModel,
  type GridRowsProp,
  type GridSlotProps,
  GridToolbarContainer,
  type GridValidRowModel,
} from '@mui/x-data-grid'
import { randomId } from '@mui/x-data-grid-generator'
import {
  Area,
  BusArrangement,
  CommunicationTopology,
  StationType,
  type Substation,
  type VoltageLevel,
} from '@prisma/client'
import {
  NotificationsProvider,
  useLocalStorageState,
  useNotifications,
  useSession,
} from '@toolpad/core'
import { useEffect, useMemo, useState } from 'react'

declare module '@mui/x-data-grid' {
  interface ToolbarPropsOverrides {
    setRows: (
      newRows: (oldRows: GridRowsProp) => GridRowsProp,
    ) => void
    setRowModesModel: (
      newModel: (oldModel: GridRowModesModel) => GridRowModesModel,
    ) => void
  }
}

function EditToolbar(props: GridSlotProps['toolbar']) {
  const { setRows, setRowModesModel } = props

  const handleClick = () => {
    const id = randomId()
    setRows((oldRows) => [
      ...oldRows,
      { id, name: '', age: '', role: '', isNew: true },
    ])
    setRowModesModel((oldModel) => ({
      ...oldModel,
      [id]: { mode: GridRowModes.Edit, fieldToFocus: 'name' },
    }))
  }

  return (
    <GridToolbarContainer>
      <Button
        disabled
        color="primary"
        startIcon={<AddIcon />}
        onClick={handleClick}>
        Add record
      </Button>
    </GridToolbarContainer>
  )
}

interface EditableRow extends Substation {
  isNew: boolean
}

export default function SubstationTable() {
  // context: message
  const notifications = useNotifications()

  const session = useSession()

  // state: rows data
  const [rows, setRows] = useState<EditableRow[]>([])

  // state: the width of each column
  const [columnWidth, setColumnWidth] = useLocalStorageState<
    Record<string, number>
  >(
    'substation-table-column-width',
    {},
    {
      codec: {
        stringify: JSON.stringify,
        parse: JSON.parse,
      },
    },
  )

  const [rowModesModel, setRowModesModel] =
    useState<GridRowModesModel>({})

  const substations = api.substation.getAll.useQuery(undefined, {
    refetchOnWindowFocus: false,
  })

  const updateName = api.substation.updateName.useMutation({
    onSuccess: () => {
      void notifications.show('Update success', {
        severity: 'success',
        autoHideDuration: 2000,
      })
    },
    onError: (error: { message: string }) => {
      void notifications.show('Update failed: ' + error.message, {
        severity: 'error',
        autoHideDuration: 2000,
      })
    },
  })

  // effect: update rows when substations.data changes
  useEffect(() => {
    setRows(
      substations.data?.map((substation) => ({
        ...substation,
        isNew: false,
      })) ?? [],
    )
  }, [substations.data])

  const handleRowEditStop: GridEventListener<'rowEditStop'> = (
    params,
    event,
  ) => {
    if (params.reason === GridRowEditStopReasons.rowFocusOut) {
      event.defaultMuiPrevented = true
    }
  }

  const handleEditClick = (id: GridRowId) => () => {
    setRowModesModel({
      ...rowModesModel,
      [id]: { mode: GridRowModes.Edit },
    })
  }

  const handleSaveClick = (id: GridRowId) => () => {
    setRowModesModel({
      ...rowModesModel,
      [id]: { mode: GridRowModes.View },
    })
  }

  const handleDeleteClick = (id: GridRowId) => () => {
    setRows(rows.filter((row) => row.id !== id))
  }

  const handleCancelClick = (id: GridRowId) => () => {
    setRowModesModel({
      ...rowModesModel,
      [id]: { mode: GridRowModes.View, ignoreModifications: true },
    })

    const editedRow = rows.find((row) => row.id === id)
    if (editedRow!.isNew) {
      setRows(rows.filter((row) => row.id !== id))
    }
  }

  const processRowUpdate = async (newRow: GridRowModel) => {
    try {
      await updateName.mutateAsync({
        id: newRow.id as string,
        name: newRow.name as string,
        isVerified: newRow.isVerified as boolean,
        scannedDocumentUrl: newRow.scannedDocumentUrl as string,
        abbreviation: newRow.abbreviation as string,
        area: newRow.area as Area,
        stationType: newRow.stationType as StationType,
        busArrangement: newRow.busArrangement as BusArrangement,
        isTemporary: newRow.isTemporary as boolean,
        isUnmanned: newRow.isUnmanned as boolean,
        addressId: newRow.addressId as string,
        deedNumber: newRow.deedNumber as string,
        voltageLevel: newRow.voltageLevel as VoltageLevel,

        lineBayCount: newRow.lineBayCount as number,
        transformerBayCount: newRow.transformerBayCount as number,
        feederCount: newRow.feederCount as number,
        communicationTopology:
          newRow.communicationTopology as CommunicationTopology,
        demolitionCost: newRow.demolitionCost as number,
        electricalCost: newRow.electricalCost as number,
        civilCost: newRow.civilCost as number,
        securityCost: newRow.securityCost as number,
        totalCost: newRow.totalCost as number,
        latitude: newRow.latitude as number,
        longitude: newRow.longitude as number,
        approvalDate: newRow.approval
          ? (newRow.approval as Date)
          : new Date(),
      })

      const updatedRow: EditableRow = {
        ...newRow,
        isNew: false,
      } as EditableRow
      setRows(
        rows.map((row) => (row.id === newRow.id ? updatedRow : row)),
      )
      return updatedRow
    } catch (error) {
      console.error(error)

      const existedRow: EditableRow = {
        ...rows.find((row) => row.id === newRow.id)!,
        isNew: false,
      } as EditableRow

      return existedRow
    }
  }

  const handleRowModesModelChange = (
    newRowModesModel: GridRowModesModel,
  ) => {
    setRowModesModel(newRowModesModel)
  }

  const columns: GridColDef<Substation>[] = useMemo(() => {
    const newColumns = [
      {
        field: 'isVerified',
        headerName: 'ยืนยัน',
        type: 'boolean',
        editable: true,
        width: columnWidth?.['isVerified'] ?? 120,
      },
      {
        field: 'name',
        headerName: 'ชื่อ',
        type: 'string',
        sortable: true,
        editable: true,
        width: columnWidth?.['name'] ?? 200,
      },
      {
        field: 'scannedDocumentUrl',
        headerName: 'เอกสาร',
        type: 'string',
        editable: true,
        renderCell: (params: { value: string }) => {
          const url = params.value as string
          return (
            <a href={url} target="_blank" rel="noopener noreferrer">
              {url}
            </a>
          )
        },
        width: columnWidth?.['scannedDocumentUrl'] ?? 200,
      },
      {
        field: 'abbreviation',
        headerName: 'ชื่อย่อ',
        type: 'string',
        editable: true,
        width: columnWidth?.['abbreviation'] ?? 120,
      },
      {
        field: 'area',
        headerName: 'เขต',
        editable: true,
        type: 'singleSelect',
        valueOptions: Object.values(Area).map((value) => ({
          value,
          label: value,
        })),
        width: columnWidth?.['area'] ?? 120,
      },
      {
        field: 'stationType',
        headerName: 'ประเภท',
        type: 'singleSelect',
        valueOptions: Object.values(StationType).map((value) => ({
          value,
          label: value,
        })),
        editable: true,
        width: columnWidth?.['stationType'] ?? 150,
      },
      {
        field: 'busArrangement',
        headerName: 'รูปแบบ',
        type: 'singleSelect',
        valueOptions: Object.values(BusArrangement).map((value) => ({
          value,
          label: value,
        })),
        editable: true,
        width: columnWidth?.['busArrangement'] ?? 150,
      },
      {
        field: 'isTemporary',
        headerName: 'ชั่วคราว',
        type: 'boolean',
        editable: true,
        width: columnWidth?.['isTemporary'] ?? 120,
      },
      {
        field: 'isUnmanned',
        headerName: 'Unmanned',
        type: 'boolean',
        editable: true,
        width: columnWidth?.['isUnmanned'] ?? 120,
      },
      {
        field: 'addressId',
        headerName: 'ที่อยู่',
        type: 'string',
        editable: true,
        width: columnWidth?.['addressId'] ?? 200,
      },
      {
        field: 'deedNumber',
        headerName: 'เลขโฉนด',
        type: 'string',
        editable: true,
        width: columnWidth?.['deedNumber'] ?? 120,
      },
      {
        field: 'voltageLevel',
        headerName: 'แรงดัน',
        type: 'string',
        editable: true,
        width: columnWidth?.['voltageLevel'] ?? 120,
      },
      {
        field: 'lineBayCount',
        headerName: 'Line Bay',
        type: 'number',
        editable: true,
        width: columnWidth?.['lineBayCount'] ?? 120,
      },
      {
        field: 'transformerBayCount',
        headerName: 'Transformer Bay',
        type: 'number',
        editable: true,
        width: columnWidth?.['transformerBayCount'] ?? 120,
      },
      {
        field: 'feederCount',
        headerName: 'Feeder',
        type: 'number',
        editable: true,
        width: columnWidth?.['feederCount'] ?? 120,
      },
      {
        field: 'communicationTopology',
        headerName: 'Topology',
        type: 'singleSelect',
        valueOptions: Object.values(CommunicationTopology).map(
          (value) => ({
            value,
            label: value,
          }),
        ),
        editable: true,
        width: columnWidth?.['communicationTopology'] ?? 120,
      },
      {
        field: 'demolitionCost',
        headerName: 'Demolition Cost',
        type: 'number',
        editable: true,
        width: columnWidth?.['demolitionCost'] ?? 120,
      },
      {
        field: 'electricalCost',
        headerName: 'Electrical Cost',
        type: 'number',
        editable: true,
        width: columnWidth?.['electricalCost'] ?? 120,
      },
      {
        field: 'civilCost',
        headerName: 'Civil Cost',
        type: 'number',
        editable: true,
        width: columnWidth?.['civilCost'] ?? 120,
      },
      {
        field: 'securityCost',
        headerName: 'Security Cost',
        type: 'number',
        editable: true,
        width: columnWidth?.['securityCost'] ?? 120,
      },
      {
        field: 'totalCost',
        headerName: 'Total Cost',
        type: 'number',
        editable: true,
        width: columnWidth?.['totalCost'] ?? 120,
      },
      {
        field: 'latitude',
        headerName: 'Latitude',
        type: 'number',
        editable: true,
        width: columnWidth?.['latitude'] ?? 120,
      },
      {
        field: 'longitude',
        headerName: 'Longitude',
        type: 'number',
        editable: true,
        width: columnWidth?.['longitude'] ?? 120,
      },
      {
        field: 'mapUrl',
        headerName: 'แผนที่',
        renderCell: (params: {
          row: { latitude: number; longitude: number }
        }) => {
          const url = `https://maps.google.com/?q=${params.row.latitude},${params.row.longitude}`

          return (
            <Button
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              size="small">
              <IconButton>
                <OpenInNewIcon />
              </IconButton>
            </Button>
          )
        },
        width: columnWidth?.['approvalDate'] ?? 120,
      },
      {
        field: 'approvalDate',
        headerName: 'Approval',
        type: 'date',
        editable: true,
        width: columnWidth?.['approvalDate'] ?? 120,
      },
      // {
      //   field: 'actions',
      //   type: 'actions',
      //   headerName: 'Actions',
      //   width: 100,
      //   cellClassName: 'actions',
      //   getActions: ({ id }) => {
      //     const isInEditMode =
      //       rowModesModel[id]?.mode === GridRowModes.Edit

      //     if (isInEditMode) {
      //       return [
      //         <GridActionsCellItem
      //           key={'save'}
      //           icon={<SaveIcon />}
      //           label="Save"
      //           sx={{
      //             color: 'primary.main',
      //           }}
      //           onClick={handleSaveClick(id)}
      //         />,
      //         <GridActionsCellItem
      //           key={'cancel'}
      //           icon={<CancelIcon />}
      //           label="Cancel"
      //           className="textPrimary"
      //           onClick={handleCancelClick(id)}
      //           color="inherit"
      //         />,
      //       ]
      //     }

      //     return [
      //       <GridActionsCellItem
      //         key={'edit'}
      //         icon={<EditIcon />}
      //         label="Edit"
      //         className="textPrimary"
      //         onClick={handleEditClick(id)}
      //         color="inherit"
      //       />,
      //       <GridActionsCellItem
      //         key={'delete'}
      //         icon={<DeleteIcon />}
      //         label="Delete"
      //         onClick={handleDeleteClick(id)}
      //         color="inherit"
      //       />,
      //     ]
      //   },
      // },
    ]

    return newColumns.map((column) => ({
      ...column,
      editable:
        session?.user?.email === 'klinsc.sea@live.com'
          ? column.editable
          : false,
    })) as GridColDef<Substation>[]
  }, [columnWidth, session?.user?.email])

  return (
    <NotificationsProvider>
      <Box
        sx={{
          height: 900,
          width: '100%',
          '& .actions': {
            color: 'text.secondary',
          },
          '& .textPrimary': {
            color: 'text.primary',
          },
        }}>
        <DataGrid
          onColumnWidthChange={(newWidth) => {
            setColumnWidth({
              ...columnWidth,
              [`${newWidth.colDef.field}`]: newWidth.width,
            })
          }}
          rows={rows}
          columns={columns}
          editMode="row"
          rowModesModel={rowModesModel}
          onRowModesModelChange={handleRowModesModelChange}
          onRowEditStop={handleRowEditStop}
          processRowUpdate={processRowUpdate}
          slots={{ toolbar: EditToolbar }}
          slotProps={{
            toolbar: {
              setRows: setRows as unknown as (
                newRows: (
                  oldRows: readonly GridValidRowModel[],
                ) => readonly GridValidRowModel[],
              ) => void,
              setRowModesModel,
            },
          }}
        />
      </Box>
    </NotificationsProvider>
  )
}
