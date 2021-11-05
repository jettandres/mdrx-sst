export default interface Receipt {
  amount: {
    amount: number
    scale: number
    currency: {
      base: number
      exponent: number
      code: string
    }
  }
  expense_id: string
  supplier: {
    streetBrgy: string
    bldg: string
    tin: string
    address: string
    name: string
  }
  image_key: string | 'Emulator'
  updated_at: string
  created_at: string
  id: string
  expense_report_id: string
}
