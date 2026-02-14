# Package: UI

Reusable UI component library.

## Responsibilities
- Shared components
- Design system
- Theme management
- Accessibility

## Structure
```
UI Package
├── components/
│   ├── Button/
│   ├── Input/
│   ├── Modal/
│   ├── Table/
│   └── ...
├── hooks/
├── utils/
└── index.ts
```

## Usage
```typescript
import { Button, Modal } from '@packages/ui';

<Button variant="primary" onClick={handleClick}>
  Click Me
</Button>
```

## Components
- Button
- Input
- Select
- Modal
- Table
- Card
- Badge
- Avatar
- Dropdown
- Tabs
- Toast
- Loading
