import type { DineroOptions } from "dinero.js"

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
    imageUrl?: string
    amount: DineroOptions<number>
  }[]
}

export default Expense
