# Package: Shared

Shared utilities & helpers.

## Responsibilities
- Common utilities
- Helper functions
- Constants
- Type definitions
- Validators

## Structure
```
Shared Package
├── utils/
│   ├── date.ts
│   ├── string.ts
│   ├── validation.ts
│   ├── format.ts
│   └── ...
├── constants/
│   ├── status.ts
│   ├── roles.ts
│   └── ...
├── types/
│   └── common.ts
└── index.ts
```

## Usage
```typescript
import { formatPhone, validateEmail } from '@packages/shared';

const phone = formatPhone('08123456789'); // +628123456789
const isValid = validateEmail('test@example.com'); // true
```
