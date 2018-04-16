'use strict';

var AWS = require('aws-sdk'),
    documentClient = new AWS.DynamoDB.DocumentClient();

module.exports.retry = (event, context, callback) => {
	
	 var eventText = JSON.stringify(event, null, 2);
	 console.log("Received event:", eventText);
	
	 var input = JSON.parse(eventText);
	 var inputData = JSON.parse(input.input);

	 callback(null, {} )
};
