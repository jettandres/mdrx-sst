import { Currency, dinero } from 'dinero.js'
import type { Dinero } from 'dinero.js'

type Payload = {
  amount: number
  currency: Currency<number>
  scale: number
}

const dineroFromFloat = (props: Payload): Dinero<number> => {
  const { amount: float, currency, scale } = props
  const factor = currency.base ** currency.exponent || scale
  const amount = Math.round(float * factor)

  return dinero({ amount, currency, scale })
}

export default dineroFromFloat
