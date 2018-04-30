This project is intended to represent a hypothetical provisioning system, along with a REST API to manage mailbox items.

The REST API ties API Gateway verbs and nouns to lambda functions, which in turn operate on a table in DynamoDB.

The provisioning engine uses step functions (split between two projects - one workflow in Node, the other in Java.) Changes to the DynamoDB alerts a lambda function via Dynamo streams. That function in turn kicks off one or the other step function workflow. The workflows don't have to be in the same region as the API, provided that the table has been turned into a "global table" (see further below.)


To install serverless, run:

```
npm install -g serverless
```

Then create an IAM user for the Serverless framework (https://serverless.com/framework/docs/providers/aws/guide/credentials/):
```
serverless config credentials --provider aws --key <KEY_ID> --secret <SECRET>
```

Some of these projects require serverless plugins and other npm modules. Run these commands in the serverless-step-functions directory:
```
serverless plugin install --name serverless-step-functions
serverless plugin install --name serverless-pseudo-parameters
serverless plugin install --name serverless-plugin-aws-alerts
npm install --save-dev serverless-plugin-tracing
npm install aws-xray-sdk
npm install moment
```

Run these commands in the serverless-step-functions-java directory:
```
serverless plugin install --name serverless-step-functions
serverless plugin install --name serverless-pseudo-parameters
```

Run these commands in the serverless-rest-api directory:
```
npm install --save-dev serverless-plugin-tracing
npm install aws-xray-sdk
```

Create a config file for each deployment stage (dev, test, etc.) in config/ using file format config-dev.yml, config-test.yml, etc. A sample file is included under config/config-{stage}.yml

For the feature that will confirm deletions via email, go to https://console.aws.amazon.com/ses/home and verify the email address you put in your config file under "sesFromAddress". This will send you an email with a link that you have to click to verify you own the address the emails will be coming from. (Make sure to do this in the region(s) you'll be sending emails from, which should be the regions(s) you deploy 'serverless-step-functions-java' to!) If you don't want this feature, just enter something in your config and don't verify the address.

For subscribing to the CloudWatch alarms via email (using the value in the config file under alarmNotificationEmail) you will need to click a link that will automatically be sent to you by AWS when you deploy. Again, if you don't want these emails, just don't click the link (but you have to enter a value in the config, for now.)

If you want to subscribe to the CloudWatch alarms in your Slack channel, enter a webhook URL (set it up here: https://my.slack.com/services/new/incoming-webhook/) and channel to publish to. Again, just enter a bogus URL and channel if you don't want this.


# The recommended order to deploy these projects:


## serverless-provisioning-dbonly 
(a resource-only project that defines the dynamodb database -- you'll need this in every region you plan to work with):
```
serverless deploy --region us-west-2 --stage dev
serverless deploy --region us-east-1 --stage dev
```


This configuration relies on the "global tables" feature of DynamoDB, so you'll also need to run this command:
```
aws dynamodb create-global-table --global-table-name mailbox-dev --replication-group RegionName=us-west-2 RegionName=us-east-1 --region us-west-2
```
(Replace regions and "mailbox-dev" as appropriate based on "stage" param)



## serverless-rest-api:
```
serverless deploy --region us-west-2 --stage dev
```

## serverless-step-functions-java:
```
mvn package
serverless deploy --region us-east-1 --stage dev
```

## serverless-step-functions:
```
serverless deploy --region us-east-1 --stage dev
```





# To clean up, run these in the reverse order as above:

## serverless-step-functions:
```
serverless remove --region us-east-1 --stage dev
```

## serverless-step-functions-java:
```
mvn clean
serverless remove --region us-east-1 --stage dev
```

## serverless-rest-api:
```
serverless remove --region us-west-2 --stage dev
```

## serverless-provisioning-dbonly 
(I wouldn't recommend removing the db service as it will delete the table, but if you need to):
```
serverless remove --region us-west-2 --stage dev
serverless remove --region us-east-1 --stage dev
```




