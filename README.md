# Welcome to the Cdk NextJs App Aws project

This is a cdk code to deploy a NextJS App on AWS.

## NextJS-Serverless-AWSCDK

This project contains a configurable script that allows you to upload your open-next build to your AWS account using custom configurations.

The configurations are managed by the `cdk.config.json` file located inside the `./lib` folder of this project. You will find an example file named `cdk.config.example.json` that demonstrates the file structure. To use it, rename it to `cdk.config.json` and make any necessary changes according to your needs.

The main node in the configuration file is the environment name, which is currently set to `dev`, `stg`, and `prd` but can be customized to your liking.

If you use different environment names, you will also need to modify the scripts located in the `package.json` file. The `ENVIRONMENT` variable is passed to the script from there.

To get started, you will need the following:

- Your NextJS Project
- One or multiple AWS accounts. You will need to [`bootstrap`](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html) each account first.
- Build your NextJS Project using the open-next project. This will create a folder called ./open-next under your root project folder.

## Building your NextJS Project with open-next

Navigate to your NextJS project root folder and run the following command:

```bash
# Go to your NextJS project root folder and build with open-next

cd myNextJSProject

npx open-next@latest build
```

This will generate a new folder called `.open-next` containing the build files to be used in the next step. This uses the [`open-next project`](https://github.com/serverless-stack/open-next) to create the build.

## Finally deploy the build to your aws account

To deploy the build to your AWS account, follow these steps:

1. Clone this repository and rename the `cdk.config.example.json` file to `cdk.config.json`.
1. Edit the configuration file to match your AWS accounts and preferred environment.
   .1 Ensure that you update the file paths for each node in the config for assets, and the three lambdas pointing to the `.open-next` folder created containing the build.
1. Run the following command to deploy to the `dev` environment (example provided):

```bash
# This is an example to deploy to "dev" environment.

npm run cdk-deploy-dev --profile={yourAwsProfile to deploy}
```

This will create the lambdas, cloudfront configuration, s3 bucket behaviors, and route53 configuration.

## Considerations

Please keep in mind the following considerations:

- This cdk script will create the Route53 entry pointing to the recently created cloudfront distribution. If you have external DNS management, you will need to update this manually. If you don't have a zone already created and don't want this to execute, you will need to edit the `nextJS-serverless-stack.ts` file
- You will need a SSL certificate [`Arn`](https://console.aws.amazon.com/acm/) created on your aws account. Grab the Arn and edit the `cdk.config.json` file for each environment.
- Add next.config.js image domains manually to lambda-functions.ts `NEXT_IMAGE_ALLOWED_DOMAINS: ""` under the environment node for the lambda. I will need to review this to automate the deploy. These are the domains allowed to be used by the Image Optimization function.
