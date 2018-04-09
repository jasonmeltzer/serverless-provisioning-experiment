package com.godaddy;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import org.apache.log4j.Logger;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;

import com.serverless.ApiGatewayResponse;
import com.serverless.Response;

public class DeletionHandler implements RequestHandler<Map<String, Object>, ApiGatewayResponse> {

	private static final Logger LOG = Logger.getLogger(DeletionHandler.class);

	@Override
	public ApiGatewayResponse handleRequest(Map<String, Object> input, Context context) {
		LOG.info("received: " + input);
		
		for (String key : input.keySet()) {
			LOG.info("key: " + key + ", value: " + input.get(key));
		}
		
		Response responseBody = null;
		try {
			String id = (String)input.get("id");
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
		

		Map<String, String> headers = new HashMap<>();
		headers.put("X-Powered-By", "AWS Lambda & Serverless");
		headers.put("Content-Type", "application/json");
		return ApiGatewayResponse.builder()
				.setStatusCode(200)
				.setObjectBody(responseBody)
				.setHeaders(headers)
				.build();
	}
}
