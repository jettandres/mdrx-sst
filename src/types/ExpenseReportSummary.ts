import type Expense from "./Expense"
import type { Dinero } from "dinero.js"

type ExpenseReportSummary = Expense & {
  total: {
    month: Dinero<number>
    ytd: Dinero<number>
  }
}

export default ExpenseReportSummary
