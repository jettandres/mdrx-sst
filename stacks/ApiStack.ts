import * as sst from '@serverless-stack/resources'

export default class ApiStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props)

    const computeExpenseReport = new sst.Function(
      this,
      'ComputeExpenseReportLambda',
      {
        handler: 'src/lambda/computeExpenseReport.handler',
        environment: {
          GRAPHQL_URL: process.env.GRAPHQL_URL,
          HASURA_SECRET: process.env.HASURA_SECRET,
        },
      }
    )

    const computeCurrentKmConsumed = new sst.Function(
      this,
      'ComputeCurrentKmConsumed',
      {
        handler: 'src/lambda/computeCurrentKmConsumed.handler',
        environment: {
          GRAPHQL_URL: process.env.GRAPHQL_URL,
          HASURA_SECRET: process.env.HASURA_SECRET,
        },
      }
    )

    // Create a HTTP API
    const api = new sst.Api(this, 'Api', {
      routes: {
        'GET /v1/compute-expense-report': computeExpenseReport,
        'POST /v1/compute-current-km-consumed': computeCurrentKmConsumed,
      },
    })

    // Show the endpoint in the output
    this.addOutputs({
      computeExpenseReport: `${api.url}/v1/compute-expense-report`,
      computeCurrentKmConsumed: `${api.url}/v1/compute-current-km-consumed`,
    })
  }
}
