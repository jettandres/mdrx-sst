import * as sst from '@serverless-stack/resources'

export default class StorageStack extends sst.Stack {
  // public reference on the bucket
  bucket: sst.Bucket

  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props)

    this.bucket = new sst.Bucket(this, 'Uploads')

    this.addOutputs({
      s3bucketName: this.bucket.s3Bucket.bucketName,
    })
  }
}
