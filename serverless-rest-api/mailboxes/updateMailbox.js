'use strict';

const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const awsXRay = require('aws-xray-sdk');
const awsSdk = awsXRay.captureAWS(require('aws-sdk'));

module.exports.update = (event, context, callback) => {
  const timestamp = new Date().getTime();
  const data = JSON.parse(event.body);

  // validation
  if (typeof data.username !== 'string') {
	    console.error('Validation Failed');
	    callback(null, {
	      statusCode: 400,
	      headers: { 'Content-Type': 'text/plain' },
	      body: 'Couldn\'t update the mailbox; username must be a string.',
	    });
	    return;
  }
	  
  if (typeof data.domain !== 'string') {
		console.error('Validation Failed');
		callback(null, {
		    statusCode: 400,
		    headers: { 'Content-Type': 'text/plain' },
		    body: 'Couldn\'t update the mailbox; domain must be a string.',
		  });
		  return;
  }

  var params = {
    TableName: process.env.DYNAMODB_TABLE_MBOX,
    Key: {
      id: event.pathParameters.id,
    },
    ExpressionAttributeNames: {
      '#mailbox_domain': 'domain',
      '#mailbox_username': 'username'
    },
    ExpressionAttributeValues: {
      ':domain': data.domain,
      ':username': data.username,
      ':updatedAt': timestamp,
      ':mailboxStatus': 'update-requested',
    },
    UpdateExpression: 'SET #mailbox_domain = :domain, #mailbox_username = :username, updatedAt = :updatedAt, mailboxStatus = :mailboxStatus',
    ReturnValues: 'ALL_NEW',
  };
  
  // if the user asked for a 'deleteConfirmEmailContact', add that to the update values
  if (data != null && data.deleteConfirmEmailContact != null && data.deleteConfirmEmailContact !== "undefined" &&
      typeof data.deleteConfirmEmailContact === 'string') {
	  
	  params.ExpressionAttributeValues[':deleteConfirmEmailContact'] = data.deleteConfirmEmailContact;
	  params.UpdateExpression += ', deleteConfirmEmailContact = :deleteConfirmEmailContact';
  }

  // update the mailbox in the database
  dynamoDb.update(params, (error, result) => {
    // handle potential errors
    if (error) {
      console.error(error);
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Couldn\'t fetch the mailbox item.',
      });
      return;
    }

    // create a response
    const response = {
      statusCode: 200,
      body: JSON.stringify(result.Attributes),
    };
    callback(null, response);
  });
};
