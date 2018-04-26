package com.example;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import org.apache.log4j.Logger;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.dynamodbv2.AmazonDynamoDB;
import com.amazonaws.services.dynamodbv2.AmazonDynamoDBClientBuilder;
import com.amazonaws.services.dynamodbv2.document.DeleteItemOutcome;
import com.amazonaws.services.dynamodbv2.document.DynamoDB;
import com.amazonaws.services.dynamodbv2.document.Item;
import com.amazonaws.services.dynamodbv2.document.Table;
import com.amazonaws.services.dynamodbv2.document.UpdateItemOutcome;
import com.amazonaws.services.dynamodbv2.document.spec.UpdateItemSpec;
import com.amazonaws.services.dynamodbv2.document.utils.NameMap;
import com.amazonaws.services.dynamodbv2.document.utils.ValueMap;
import com.amazonaws.services.dynamodbv2.model.ReturnValue;

import com.serverless.ApiGatewayResponse;
import com.serverless.Response;



public class CheckConfirmDeletion {

	private static final Logger LOG = Logger.getLogger(CheckConfirmDeletion.class);
	
	static AmazonDynamoDB client = AmazonDynamoDBClientBuilder.standard().build();
    static DynamoDB dynamoDB = new DynamoDB(client);

    static String tableName = System.getenv("DYNAMODB_TABLE_MBOX");

	//@Override
	public Map<String, Object> handleRequest(Map<String, Object> input, Context context) throws DeleteNotConfirmedException {
		LOG.info("received: " + input);
		
		for (String key : input.keySet()) {
			LOG.info("key: " + key + ", value: " + input.get(key));
		}
		
		String id = null, domain = null, username = null;
		try {
			id = (String)input.get("id");
			domain = (String)input.get("domain");
			username = (String)input.get("username");
			if (input.get("deleteConfirmEmailContact") != null && !((String)input.get("deleteConfirmEmailContact")).isEmpty()) {
				LOG.info("Deletion of mailbox " + id + " is still pending confirmation. Will not delete.");
				
				Table table = dynamoDB.getTable(tableName);
				try { 
					UpdateItemSpec updateItemSpec = new UpdateItemSpec().withPrimaryKey("id", id)
							.withUpdateExpression("set #ms=:val1")
			                .withNameMap(new NameMap().with("#ms", "mailboxStatus"))
			                .withValueMap(new ValueMap().withString(":val1", "delete-confirmation-required"))
			                .withReturnValues(ReturnValue.ALL_NEW);

					UpdateItemOutcome outcome = table.updateItem(updateItemSpec);
				}  catch (Exception e) {
					LOG.error("Could not update status of mailbox " + id + " to 'delete-confirmation-required'.", e);
				}

				throw new DeleteNotConfirmedException("Deletion of mailbox " + id + " is still pending confirmation. Will not delete.");
			}	
		} catch (ClassCastException cce) {
			LOG.error("Exception casting value to string", cce);
		}
		
		// Pass along all of the inputs to the next step
		return input;

	}

}
