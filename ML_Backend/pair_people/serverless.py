"""
Serverless entry point for AWS Lambda deployment.

To deploy this application to AWS Lambda:
1. Install AWS SAM CLI and set up credentials
2. Create a SAM template for the Lambda function
3. Package all dependencies and deploy

Example SAM template (template.yaml):
```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Resources:
  MitraUserGroupingFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: .
      Handler: serverless.handler
      Runtime: python3.9
      Timeout: 30
      MemorySize: 1024
      Events:
        ApiEvent:
          Type: Api
          Properties:
            Path: /{proxy+}
            Method: ANY
```

Deploy with:
$ sam build
$ sam deploy --guided
"""

import os
import sys
from mangum import Mangum

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the FastAPI application from user_groups_api.py
from RAG.user_groups_api import app

# Create the Lambda handler
handler = Mangum(app)

# If running locally via SAM CLI
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run("user_groups_api:app", host="0.0.0.0", port=port) 