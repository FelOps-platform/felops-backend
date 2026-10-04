# Actions

## 1. Overview
This document includes the workflows, API endpoints, database design related to actions.

## 2. Workflows

### 2.1 Viewing Workspace Actions
1. User navigates to the actions page.
2. Frontend fetches the list of available actions from the backend.
3. Backend fetches integrations connected to this workspace and returns a map of integrations to an array of their respective actions.
  - Each action includes the following information:
    - Name
    - Description
4. Frontend displays the list of actions grouped by integration.
5. User can filter the actions by integration or search for a specific action using a search bar.

### 2.2 Viewing Agent Allowed Actions
1. User navigates to the agent actions page.
2. Frontend fetches the list of allowed actions for the selected agent from the backend.
3. Backend fetches integrations connected to the workspace and returns a map of integrations to an array of their respective actions.
  - Each action includes the following:
    - Name
    - Description
4. Frontend displays the list of allowed actions grouped by integration.
5. User can filter the actions by integration or search for a specific action using a search bar.
6. User can select the action they want to allow for the agent.
  - Frontend sends the selected action to the backend.
  - Backend updates the allowed actions for the agent in the database.
7. For allowed actions, user can configure it to require approval before execution.
  - Frontend sends the require approval flag to the backend.
  - Backend updates the action configuration for the agent in the database.

### 2.3 Viewing Workspace Execution History
1. User navigates to the execution history page.
2. Frontend fetches the list of executed actions from all agents in the workspace from the backend.
3. Backend returns a list of executed actions with the following information:
  - Action Name
  - Integration Name
  - Agent Name
  - Timestamp
4. Frontend displays the list of executed actions in a table format.

### 2.4 Viewing Agent Execution History
1. User navigates to the agent execution history page.
2. Frontend fetches the list of executed actions for the selected agent from the backend.
3. Backend returns a list of executed actions with the following information:
  - Action Name
  - Integration Name
  - Initiated By: User / Agent (auto)
  - Timestamp
4. Frontend displays the list of executed actions in a table format.

### 3. API Endpoints

### 4. Database Design

### 5. Future Work
- Creating custom actions