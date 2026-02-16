# Module: Chatbot

Chatbot & automation engine.

## Responsibilities
- Workflow execution
- Condition evaluation
- Action handling
- Automation rules
- AI integration (future)

## Structure
```
Chatbot Module
├── engine/
│   ├── flow-executor.ts
│   ├── condition-evaluator.ts
│   └── action-handler.ts
├── services/
│   ├── workflow.service.ts
│   └── automation.service.ts
├── api/
│   └── routes.ts
└── types.ts
```

## Features
- Visual flow builder
- Conditional logic
- Multi-step workflows
- Scheduled automation
- Event-triggered actions

## Usage
```typescript
import { WorkflowService } from '@modules/chatbot';

const workflow = new WorkflowService(tenantId);

// Execute workflow
await workflow.execute(workflowId, {
  trigger: 'message_received',
  data: message
});
```
