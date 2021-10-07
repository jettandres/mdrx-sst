import type { DineroOptions } from "dinero.js"

type Expense = {
  id: string
  name: string
  receipts: {
    amount: DineroOptions<number>
  }[]
}

export default Expense
