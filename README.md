# Welcome to the Cdk NextJs App Aws project

This is a cdk code to deploy a NextJS App on AWS.

## NextJS-Serverless-AWSCDK

This project contains a configurable script to upload to your open-next build to your AWS account, using some configurations.

Configurations are managed by the `cdk.config.json` file located inside the `./lib` folder of this project.
You will find an example `cdk.config.example.json` with the structure. Rename it to `cdk.config.json` and start editing it according to your needs.

The main node has the environment name. In this case, you will see `dev` `stg` `prd` but could be renamed matching your preferences.

If you use different environment names, you will need to edit also the scripts located in the `package.json` file. The `ENVIRONMENT` variable is passed to the script from there.

## What do you need first?

1. Your NextJS Project
1. One or multiple AWS accounts. You will need to [`bootstrap`](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html) each account first.

## Then you need to create the build using open-next

Build your NextJS Project using the [`open-next project`](https://github.com/serverless-stack/open-next). This will create a folder called `./open-next` under your root project folder.

```bash
# Go to your NextJS project root folder and build with open-next

cd myNextJSProject

npx open-next@latest build
```

You will see a new folder called .open-next containing the generated build to be used on the next step.

## Finally deploy the build to your aws account

1. Clone this repository, rename the `cdk.config.example.json` to `cdk.config.json` and edit the file with your preferences and matching the aws accounts and environment you choose to deploy.
1. Be sure to edit the filePath for each node in the config for assets, and the three lambdas pointing to the `.open-next` folder created containing the build.
1. To deploy, there is a command under package.json, for `dev` environment:

```bash
# This is an example to deploy to "dev" environment.

npm run cdk-deploy-dev --profile={yourAwsProfile to deploy}
```

This will create the lambdas, cloudfront configuration, s3 bucket behaviors, and route53 configuration.

## Considerations

- This cdk script will create the Route53 entry pointing to the recently created cloudfront distribution. If you have external DNS management, you will need to update this manually. If you don't have a zone already created and don't want this to execute, you will need to edit the `nextJS-serverless-stack.ts` file
- You will need a SSL certificate [`Arn`](https://console.aws.amazon.com/acm/) created on your aws account. Grab the Arn and edit the `cdk.config.json` file for each environment.
- Add next.config.js image domains manually to lambda-functions.ts `NEXT_IMAGE_ALLOWED_DOMAINS: ""` under the environment node for the lambda. I will need to review this to automate the deploy. These are the domains allowed to be used by the Image Optimization function.
