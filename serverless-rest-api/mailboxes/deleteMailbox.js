'use strict';

const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
const crypto = require('crypto');

const awsXRay = require('aws-xray-sdk');
const awsSdk = awsXRay.captureAWS(require('aws-sdk'));

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.delete = (event, context, callback) => {
  const timestamp = new Date().getTime();  
  const data = JSON.parse(event.body);	
  
  var eventText = JSON.stringify(event, null, 2);
  console.log("Received event:", eventText);
  
  // Instead of directly deleting the item, this function will mark it for deletion by a workflow 
  /*dynamoDb.delete(params, (error) => {
    // handle potential errors
    if (error) {
      console.error(error);
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Couldn\'t remove the mailbox item.',
      });
      return;
  }*/
  
  var params = {
      TableName: process.env.DYNAMODB_TABLE_MBOX,
	  Key: {
	    id: event.pathParameters.id,
      },
      ExpressionAttributeValues: {
		':updatedAt': timestamp,
		':mailboxStatus': 'delete-requested',
	  },
	  UpdateExpression: 'SET updatedAt = :updatedAt, mailboxStatus = :mailboxStatus',
	  ReturnValues: 'ALL_NEW',
  };

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
      body: JSON.stringify({}),
    };
    callback(null, response);
  });
};
