import ApiStack from './ApiStack'
import StorageStack from './StorageStack'
import * as sst from '@serverless-stack/resources'
import AuthStack from './AuthStack'
import AuthApiStack from './AuthApiStack'

export default function main(app: sst.App): void {
  // Set default runtime for all functions
  app.setDefaultFunctionProps({
    runtime: 'nodejs12.x',
  })

  const storageStack = new StorageStack(app, 'storage')
  const apiStack = new ApiStack(app, 'api', { bucket: storageStack.bucket })

  const authStack = new AuthStack(app, 'auth', {
    api: apiStack.api,
    bucket: storageStack.bucket,
  })

  new AuthApiStack(app, 'auth-api', {
    auth: authStack.auth,
  })
}
