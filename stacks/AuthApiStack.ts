import * as sst from '@serverless-stack/resources'

type Props = sst.StackProps & {
  auth: sst.Auth
}

export default class AuthApiStack extends sst.Stack {
  api: sst.Api
  authHookUrl: string

  constructor(scope: sst.App, id: string, props?: Props) {
    super(scope, id, props)

    const { auth } = props

    const verifyToken = new sst.Function(this, 'VerifyToken', {
      handler: 'src/lambda/verifyToken.handler',
      environment: {
        GRAPHQL_URL: process.env.GRAPHQL_URL,
        HASURA_SECRET: process.env.HASURA_SECRET,
        USER_POOL_ID: auth.cognitoUserPool.userPoolId,
        CLIENT_ID: auth.cognitoUserPoolClient.userPoolClientId,
      },
    })

    // Create a HTTP API
    this.api = new sst.Api(this, 'Api', {
      routes: {
        'GET /v1/verify-token': verifyToken,
      },
    })

    this.authHookUrl = `${this.api.url}/v1/verify-token`

    // Show the endpoint in the output
    this.addOutputs({
      verifyToken: `GET ${this.authHookUrl}`,
    })
  }
}
