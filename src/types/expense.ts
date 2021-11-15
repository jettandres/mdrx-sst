import type { DineroSnapshot } from 'dinero.js'

type Expense = {
  id: string
  name: string
  receipts: {
    id?: string
    supplier?: {
      tin: string
      bldg: string
      name: string
      address: string
      streetBrgy: string
    }
    imageKey: string
    amount: DineroSnapshot<number>
    kmReading?: {
      value: number
      litersAdded: number
    }
    vatable: boolean
    net: DineroSnapshot<number>
    vat: DineroSnapshot<number>
  }[]
}

export default Expense
