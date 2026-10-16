# Integrations

## 1. Overview
This document includes the workflows, API endpoints, database design related to integrations.

## 2. Workflows

### 2.1 Connecting To an Integration
1. User navigates to the integrations page.
2. Frontend fetches list of available integrations and their status from the backend.
  - Each integration includes the following information:
    - ID (string)
    - Name
    - Image URL
    - Status: Connected / Not Connected
    - Authorization method: OAuth / API Key
    - Type: E-commerce / ERP
3. User selects an integration to connect.
4. Frontend displays the integration details and actions available for that integration.
5. User authorizes the application.
  - If the authorization method is OAuth:
  - Frontend redirects the user to the integration's authorization page.
  - User authorizes the application and is redirected back to the application's callback URL with an authorization code.
  - Backend validates the OAuth state parameter to prevent CSRF attacks.
  - Backend exchanges the authorization code for an access token and, if provided, a refresh token.
  - Backend securely stores the tokens and associated integration details in the database.
  - Backend redirects the user to the frontend with the authorization result
  - If the authorization method is API Key:
    - Frontend prompts the user to enter their API key.
    - User submits the API key to the backend.
    - Backend validates the API key and stores it securely in the database.
6. Backend adds a record in the database associating the integration with the workspace and the user who connected it.

### 2.2 Disconnecting From an Integration
1. User navigates to the integrations page.
2. Frontend fetches the list of connected integrations from the backend.
3. User selects an integration to disconnect. 
4. Frontend sends a request to the backend to disconnect the integration.
  - Request includes the integration ID.
5. Backend removes the access token, refresh token, or API key from the database.
6. Backend deletes the record in the database associating the integration with the workspace and the user who connected it.

### 3. API Endpoints

### 4. Database Design

### 5. Future Work
- Creating custom actions