'use strict';

module.exports.avoidNoid = (event, context, callback) => {
	
	 var eventText = JSON.stringify(event, null, 2);
	 console.log("Received event:", eventText);
	
	 
	
/*	 const response = {
         statusCode: 200,
         body: JSON.stringify({
             message: 'avoided the noid!',
             input: event,
	     }),
	 };

  callback(null, response);*/
};


/*
Event for new item (id=456, domain=abc.com):
{
    "Records": [
        {
            "eventID": "83e9b2f8e0af37f50db0b39bc3c00f99",
            "eventName": "INSERT",
            "eventVersion": "1.1",
            "eventSource": "aws:dynamodb",
            "awsRegion": "us-east-1",
            "dynamodb": {
                "ApproximateCreationDateTime": 1523049540,
                "Keys": {
                    "id": {
                        "S": "456"
                    }
                },
                "NewImage": {
                    "domain": {
                        "S": "abc.com"
                    },
                    "id": {
                        "S": "456"
                    }
                },
                "SequenceNumber": "200000000004282719674",
                "SizeBytes": 23,
                "StreamViewType": "NEW_AND_OLD_IMAGES"
            },
            "eventSourceARN": "arn:aws:dynamodb:us-east-1:849835118694:table/mailbox-dev/stream/2018-04-06T20:25:38.011"
        }
    ]
}  
  
  
  
Event for updated item:
{
    "Records": [
        {
            "eventID": "3482b9c612f9c81baf8e57558b250307",
            "eventName": "MODIFY",
            "eventVersion": "1.1",
            "eventSource": "aws:dynamodb",
            "awsRegion": "us-east-1",
            "dynamodb": {
                "ApproximateCreationDateTime": 1523049660,
                "Keys": {
                    "id": {
                        "S": "456"
                    }
                },
                "NewImage": {
                    "domain": {
                        "S": "abcd.com"
                    },
                    "id": {
                        "S": "456"
                    },
                    "username": {
                        "S": "jason"
                    }
                },
                "OldImage": {
                    "domain": {
                        "S": "abc.com"
                    },
                    "id": {
                        "S": "456"
                    }
                },
                "SequenceNumber": "300000000004282782098",
                "SizeBytes": 55,
                "StreamViewType": "NEW_AND_OLD_IMAGES"
            },
            "eventSourceARN": "arn:aws:dynamodb:us-east-1:849835118694:table/mailbox-dev/stream/2018-04-06T20:25:38.011"
        }
    ]
}  
  
  
Event for deleted item:
{
    "Records": [
        {
            "eventID": "fe4deee89b1029099b5b2225bb52fd4b",
            "eventName": "REMOVE",
            "eventVersion": "1.1",
            "eventSource": "aws:dynamodb",
            "awsRegion": "us-east-1",
            "dynamodb": {
                "ApproximateCreationDateTime": 1523050140,
                "Keys": {
                    "id": {
                        "S": "456"
                    }
                },
                "OldImage": {
                    "domain": {
                        "S": "abcd.com"
                    },
                    "id": {
                        "S": "456"
                    },
                    "username": {
                        "S": "jason"
                    }
                },
                "SequenceNumber": "400000000004283097793",
                "SizeBytes": 37,
                "StreamViewType": "NEW_AND_OLD_IMAGES"
            },
            "eventSourceARN": "arn:aws:dynamodb:us-east-1:849835118694:table/mailbox-dev/stream/2018-04-06T20:25:38.011"
        }
    ]
}

*/