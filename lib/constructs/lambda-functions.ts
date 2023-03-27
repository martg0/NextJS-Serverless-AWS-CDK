import * as path from "path";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { type EnvironmentVars } from "../types/config";
import { type Bucket } from "aws-cdk-lib/aws-s3";
import { Duration, RemovalPolicy } from "aws-cdk-lib";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";

export class LambdaFunctions extends Construct {
  public readonly myServerFunction: lambda.Function;
  public readonly myImageFunction: lambda.Function;
  public readonly myMiddlewareFunction: lambda.Function;

  constructor(
    scope: Construct,
    id: string,
    props: { environmentVars: EnvironmentVars } & { myBucket: Bucket }
  ) {
    super(scope, id);
    const environmentVars = props.environmentVars;
    const myBucket = props.myBucket;

    // NextJS Server Function
    this.myServerFunction = new lambda.Function(this, "MyServerFunction", {
      functionName: environmentVars.lambdaServerFunction.functionName,
      description: `${environmentVars.applicationName} (${environmentVars.environment}) - NextJS Server Function`,
      handler: "index.handler",
      currentVersionOptions: {
        removalPolicy: RemovalPolicy.DESTROY,
      },
      logRetention: RetentionDays.FIVE_DAYS,
      runtime: lambda.Runtime.NODEJS_18_X,
      memorySize: environmentVars.lambdaServerFunction.memorySize,
      timeout: Duration.seconds(5),
      code: lambda.Code.fromAsset(
        path.join(__dirname, environmentVars.lambdaServerFunction.filesPath)
      ),
    });

    // Image Optimization Function
    this.myImageFunction = new lambda.Function(this, "myImageFunction", {
      functionName:
        environmentVars.lambdaImageOptimizationFunction.functionName,
      description: `${environmentVars.applicationName} (${environmentVars.environment}) - Image Optimization Function`,
      handler: "index.handler",
      currentVersionOptions: {
        removalPolicy: RemovalPolicy.DESTROY,
      },
      logRetention: RetentionDays.FIVE_DAYS,
      runtime: lambda.Runtime.NODEJS_18_X,
      memorySize: environmentVars.lambdaImageOptimizationFunction.memorySize,
      code: lambda.Code.fromAsset(
        path.join(
          __dirname,
          environmentVars.lambdaImageOptimizationFunction.filesPath
        )
      ),
      architecture: lambda.Architecture.ARM_64,
      timeout: Duration.seconds(25),
      environment: {
        BUCKET_NAME: myBucket.bucketName,
        // TODO: Add allowed domains here. These are on the nextjs config file.
        NEXT_IMAGE_ALLOWED_DOMAINS: "",
      },
      initialPolicy: [
        new PolicyStatement({
          actions: ["s3:GetObject"],
          resources: [myBucket.arnForObjects("*")],
        }),
      ],
    });

    // Middleware Function
    this.myMiddlewareFunction = new lambda.Function(
      this,
      "myMiddlewareFunction",
      {
        functionName: environmentVars.lambdaMiddlewareFunction.functionName,
        description: `${environmentVars.applicationName} (${environmentVars.environment}) - Middlware @Edge Function`,
        handler: "index.handler",
        currentVersionOptions: {
          removalPolicy: RemovalPolicy.DESTROY,
        },
        logRetention: RetentionDays.FIVE_DAYS,
        runtime: lambda.Runtime.NODEJS_18_X,
        memorySize: environmentVars.lambdaMiddlewareFunction.memorySize,
        code: lambda.Code.fromAsset(
          path.join(
            __dirname,
            environmentVars.lambdaMiddlewareFunction.filesPath
          )
        ),
      }
    );
  }
}
