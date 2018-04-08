'use strict';

var AWS = require('aws-sdk'),
    documentClient = new AWS.DynamoDB.DocumentClient(); 

module.exports.complete = (event, context, callback) => {
	
	 var eventText = JSON.stringify(event, null, 2);
	 console.log("Received event:", eventText);
	
	 
	 var input = JSON.parse(eventText);
	 var inputData = JSON.parse(input.input);
	 
	 var dynamoParams = {
	     TableName : process.env.DYNAMODB_TABLE_MBOX,
	     Key:{
	         "id": inputData.id
         },
	     UpdateExpression: "set mailboxStatus = :s",
	     ExpressionAttributeValues:{
	         ":s": "provisioning-completed"
	     },
	     ReturnValues:"UPDATED_NEW"
	 };

	 documentClient.update(dynamoParams, function(err, data){
	     if (err) console.log(err);
		// else console.log(data);
	 });

	 
	 const response = {
         statusCode: 200
	 };
	 
     callback(null, response);
};

