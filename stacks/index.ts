import ApiStack from './ApiStack'
import StorageStack from './StorageStack'
import * as sst from '@serverless-stack/resources'
import AuthStack from './AuthStack'
import AuthApiStack from './AuthApiStack'
import VpcStack from './VpcStack'
import CertificatesStack from './CertificatesStack'
import HasuraStack from './HasuraStack'

export default function main(app: sst.App): void {
  // Set default runtime for all functions
  app.setDefaultFunctionProps({
    runtime: 'nodejs14.x',
  })

  const storageStack = new StorageStack(app, 'storage')
  const apiStack = new ApiStack(app, 'api', { bucket: storageStack.bucket })

  const authStack = new AuthStack(app, 'auth', {
    api: apiStack.api,
    bucket: storageStack.bucket,
  })

  const authApiStack = new AuthApiStack(app, 'auth-api', {
    auth: authStack.auth,
  })

  const vpcStack = new VpcStack(app, 'vpc')
  const certStack = new CertificatesStack(app, 'certificates', {
    hostedZoneId: process.env.HOSTED_ZONE_ID,
    hostedZoneName: process.env.HOSTED_ZONE_NAME,
    hasuraHostname: process.env.HASURA_HOSTNAME,
  })

  new HasuraStack(app, 'hasura', {
    appName: 'mdrx-hasura',
    hostedZoneId: process.env.HOSTED_ZONE_ID,
    hostedZoneName: process.env.HOSTED_ZONE_NAME,
    hasuraHostname: process.env.HASURA_HOSTNAME,
    certificates: certStack.certificates,
    vpc: vpcStack.vpc,
    multiAz: false,
    authHookUrl: authApiStack.authHookUrl,
    hasuraAdminSecret: process.env.HASURA_SECRET,
  })
}
