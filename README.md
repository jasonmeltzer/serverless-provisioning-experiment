This project is intended to represent a hypothetical provisioning system, along with a REST API to manage mailbox items.

The REST API ties API Gateway verbs and nouns to lambda functions, which in turn operate on a table in DynamoDB.

The provisioning engine uses step functions (split between two projects - one workflow in Node, the other in Java.) Changes to the DynamoDB alerts a lambda function via Dynamo streams. That function in turn kicks off one or the other step function workflow. The workflows don't have to be in the same region as the API, provided that the table has been turned into a "global table" (see further below.)


To install serverless, run:
npm install -g serverless

Then create an IAM user for the Serverless framework (https://serverless.com/framework/docs/providers/aws/guide/credentials/):
serverless config credentials --provider aws --key <KEY_ID> --secret <SECRET>


Some of these projects require serverless plugins. Run these commands in the serverless-step-functions and serverless-step-functions-java directories:
serverless plugin install --name serverless-step-functions
serverless plugin install --name serverless-pseudo-parameters


The recommended order to deploy these projects:

Serverless-rest-api:
```
serverless deploy --region us-west-2 --stage dev
```

serverless-step-functions-java:
```
mvn package
serverless deploy --region us-east-1 --stage dev
```

serverless-step-functions:
```
serverless deploy --region us-east-1 --stage dev
```


This configuration relies on the "global tables" feature of DynamoDB, so you'll also need to run this command:
aws dynamodb create-global-table --global-table-name mailbox-dev --replication-group RegionName=us-west-2 RegionName=us-east-1 --region us-west-2
(Replace regions and "mailbox-dev" as appropriate based on "stage" param)




To clean up:
Serverless-rest-api:
```
serverless remove --region us-west-2 --stage dev
```

serverless-step-functions-java:
```
mvn clean
serverless remove --region us-east-1 --stage dev
```

serverless-step-functions:
```
serverless remove --region us-east-1 --stage dev
```
