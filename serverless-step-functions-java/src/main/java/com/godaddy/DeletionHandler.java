package com.godaddy;

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
import com.amazonaws.services.dynamodbv2.document.spec.DeleteItemSpec;
import com.amazonaws.services.dynamodbv2.document.utils.NameMap;
import com.amazonaws.services.dynamodbv2.document.utils.ValueMap;
import com.amazonaws.services.dynamodbv2.model.ReturnValue;

import com.serverless.ApiGatewayResponse;
import com.serverless.Response;



public class DeletionHandler implements RequestHandler<Map<String, Object>, ApiGatewayResponse> {

	private static final Logger LOG = Logger.getLogger(DeletionHandler.class);
	
	static AmazonDynamoDB client = AmazonDynamoDBClientBuilder.standard().build();
    static DynamoDB dynamoDB = new DynamoDB(client);

    static String tableName = System.getenv("DYNAMODB_TABLE_MBOX");

	@Override
	public ApiGatewayResponse handleRequest(Map<String, Object> input, Context context) {
		LOG.info("received: " + input);
		
		for (String key : input.keySet()) {
			LOG.info("key: " + key + ", value: " + input.get(key));
		}
		
		Response responseBody = null;
		String id = null;
		try {
			id = (String)input.get("id");
			String domain = (String)input.get("domain");
			String username = (String)input.get("username");
			if (domain != null && username != null) {
				responseBody = new Response("Goodbye " + username + "@" + domain + ", we'll miss you!");
			} else if (id != null) {
				responseBody = new Response("Goodbye user " + id + ", we'll miss you!");
			} else {
				responseBody = new Response("Goodbye whoever you were, we'll miss you!");
			}
		} catch (ClassCastException e) {
			LOG.error("Exception casting value to string", e);
			responseBody = new Response("Goodbye whoever you were, we'll miss you!");
		}
		
		// Delete the mailbox
		deleteItem(id);
		

		Map<String, String> headers = new HashMap<>();
		headers.put("X-Powered-By", "AWS Lambda & Serverless");
		headers.put("Content-Type", "application/json");
		return ApiGatewayResponse.builder()
				.setStatusCode(200)
				.setObjectBody(responseBody)
				.setHeaders(headers)
				.build();
	}

	private static void deleteItem(String id) {

        Table table = dynamoDB.getTable(tableName);

        try {

            DeleteItemSpec deleteItemSpec = new DeleteItemSpec().withPrimaryKey("id", id)
                .withReturnValues(ReturnValue.ALL_OLD);

            DeleteItemOutcome outcome = table.deleteItem(deleteItemSpec);

            // Check the response.
            System.out.println("Printing item that was deleted...");
            System.out.println(outcome.getItem().toJSONPretty());

        }
        catch (Exception e) {
            System.err.println("Error deleting item in " + tableName);
            System.err.println(e.getMessage());
        }
    }
}
