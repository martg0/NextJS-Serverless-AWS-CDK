export interface Config {
  [key: string]: EnvironmentVars;
}

export interface EnvironmentVars {
  environment: string;
  stackName?: string;
  stackDescription: string;
  account: string;
  region: string;
  applicationName: string;

  assets: {
    bucketName: string;
    filesPath: string;
    autoDeleteObjects: boolean;
    logsBucketArn: string;
  };

  cloudfront: {
    distributionId?: string;
    sslCertArn?: string;
    domain: string;
    aliases: string[];
  };

  lambdaServerFunction: {
    functionName: string;
    filesPath: string;
    memorySize: number;
  };

  lambdaImageOptimizationFunction: {
    functionName: string;
    filesPath: string;
    memorySize: number;
  };

  lambdaMiddlewareFunction: {
    functionName: string;
    filesPath: string;
    memorySize: number;
  };
}
