'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const awsXRay = require('aws-xray-sdk');
const awsSdk = awsXRay.captureAWS(require('aws-sdk'));

module.exports.create = (event, context, callback) => {
  const timestamp = new Date().getTime();
  const data = JSON.parse(event.body);
  if (typeof data.username !== 'string') {
    console.error('Validation Failed');
    callback(null, {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Couldn\'t create the mailbox; username must be a string.',
    });
    return;
  }
  
  if (typeof data.domain !== 'string') {
	    console.error('Validation Failed');
	    callback(null, {
	      statusCode: 400,
	      headers: { 'Content-Type': 'text/plain' },
	      body: 'Couldn\'t create the mailbox; domain must be a string.',
	    });
	    return;
  }

  var params = {
    TableName: process.env.DYNAMODB_TABLE_MBOX,
    Item: {
      id: uuid.v1(),
      username: data.username,
      domain: data.domain, // change this later to reference another table
      createdAt: timestamp,
      updatedAt: timestamp,
      mailboxStatus: "initial",
    },
  };
  
  // if the user asked for a 'deleteConfirmEmailContact', add that to the Item values
  if (data != null && data.deleteConfirmEmailContact != null && data.deleteConfirmEmailContact !== "undefined" &&
      typeof data.deleteConfirmEmailContact === 'string') {
	  params.Item["deleteConfirmEmailContact"] = data.deleteConfirmEmailContact;
  }

  // write the mailbox to the database
  dynamoDb.put(params, (error) => {
    // handle potential errors
    if (error) {
      console.error(error);
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Couldn\'t create the mailbox item.',
      });
      return;
    }

    // create a response
    const response = {
      statusCode: 200,
      body: JSON.stringify(params.Item),
    };
    callback(null, response);
  });
};
