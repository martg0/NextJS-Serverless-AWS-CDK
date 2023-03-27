# Welcome to the Cdk NextJs App Aws project

This is a cdk code to deploy a NextJS App on AWS.

## NextJS-Serverless-AWSCDK

This project contains a configurable script to upload to your open-next build to your AWS account, using some configurations.

Configurations are managed by the `cdk.config.json` file located inside the `./lib` folder of this project.
You will find an example `cdk.config.example.json` with the structure. Rename it to `cdk.config.json` and start editing it according to your needs.

The main node has the environment name. In this case, you will see `dev` `stg` `prd` but could be renamed matching your preferences.

If you use different environment names, you will need to edit also the scripts located in the `package.json` file. The `ENVIRONMENT` variable is passed to the script from there.

## What do you need

1. Your NextJS Project
1. One or multiple AWS accounts. You will need to [`bootstrap`](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html) each account first.
1. Build your NextJS Project with [`open-next project`](https://github.com/serverless-stack/open-next). This will create a folder called `./open-next` under your root project folder. I execute the following command on the project root:

```bash
npx open-next@latest build
```

1. Clone this repository, rename the `cdk.config.example.json` to `cdk.config.json` and edit the file with your preferences.
1. Be sure to edit the filePath for assets, and the three lambdas pointing to the `.open-next` folder.
1. To deploy, there is a command under package.json, for `dev` environment, is:

```bash
npm run cdk-deploy-dev --profile=(yourAwsProfile to deploy)`
```
