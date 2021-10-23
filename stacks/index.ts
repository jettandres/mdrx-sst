import ApiStack from './ApiStack'
import StorageStack from './StorageStack'
import * as sst from '@serverless-stack/resources'

export default function main(app: sst.App): void {
  // Set default runtime for all functions
  app.setDefaultFunctionProps({
    runtime: 'nodejs12.x',
  })

  const storageStack = new StorageStack(app, 'storage')

  // Add more stacks
  new ApiStack(app, 'api-stack', { storage: storageStack })
}
