import axios from 'axios'

async function client<T, T2>(
  query: string,
  variables: T2
): Promise<{ data: T }> {
  const GRAPHQL_URL = process.env.GRAPHQL_URL as string
  const HASURA_SECRET = process.env.HASURA_SECRET as string

  const response = await axios.post(
    GRAPHQL_URL,
    {
      query,
      variables,
    },
    {
      headers: {
        'x-hasura-admin-secret': HASURA_SECRET,
      },
    }
  )

  if (response.data.errors) {
    console.log('gql error', response.data.errors)
  }

  return response.data
}

export default client
