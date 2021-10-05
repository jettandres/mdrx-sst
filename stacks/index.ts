import ApiStack from "./ApiStack"
import * as sst from "@serverless-stack/resources"

export default function main(app: sst.App): void {
  // Set default runtime for all functions
  app.setDefaultFunctionProps({
    runtime: "nodejs12.x",
  })

  new ApiStack(app, "api-stack")

  // Add more stacks
}
