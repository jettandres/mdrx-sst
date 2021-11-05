export default interface HasuraEvent {
  event: {
    session_variables: {
      'x-hasura-role'?: 'admin' | string
    }
    op: 'INSERT' | 'DELETE' | 'UPDATE' | 'MANUAL'
    data: {
      old?: unknown
      new?: unknown
    }
    trace_context: {
      trace_id: number
      span_id: number
    }
  }
  created_at: string
  id: string
  delivery_info: {
    max_retries: number
    current_retry: number
  }
  trigger: {
    name: string
  }
  table: {
    schema: string
    name: string
  }
}
