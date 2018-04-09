This project was adapted from the example "AWS Serverless REST API example in NodeJS" on serverless.com. To install, run:
npm install -g serverless

Then create an IAM user for the Serverless framework (https://serverless.com/framework/docs/providers/aws/guide/credentials/):
serverless config credentials --provider aws --key <KEY_ID> --secret <SECRET>

Deploy using:
serverless deploy --region us-west-2

Uninstall:
serverless remove --region us-west-2

## Usage

You can create, retrieve, update, or delete todos with the following commands:

### Create a Mailbox

```bash
curl -X POST https://XXXXXXX.execute-api.us-east-1.amazonaws.com/dev/mailboxes --data '{ "domain": "abc.com", "username": "Jason" }'
```

### List all Mailboxes

```bash
curl https://XXXXXXX.execute-api.us-east-1.amazonaws.com/dev/mailboxes
```
```

### Get one Mailbox

```bash
# Replace the <id> part with a real id from your mailbox table
curl https://XXXXXXX.execute-api.us-east-1.amazonaws.com/dev/mailboxes/<id>
```
```

### Update a Mailbox

```bash
# Replace the <id> part with a real id from your todos table
curl -X PUT https://XXXXXXX.execute-api.us-east-1.amazonaws.com/dev/mailboxes/<id> --data '{ "domain": "def.com", "username": "mark" }'
```
```

### Delete a Mailbox

```bash
# Replace the <id> part with a real id from your mailbox table
curl -X DELETE https://XXXXXXX.execute-api.us-east-1.amazonaws.com/dev/mailboxes/<id>
```
