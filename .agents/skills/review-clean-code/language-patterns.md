# Language-Specific Patterns

## Table of Contents

- [TypeScript/JavaScript](#typescriptjavascript)

---

## TypeScript/JavaScript

### Overuse of `any` Type

```typescript
// ❌
function process(data: any) {
  return data.value;
}

// ✅
interface DataPayload {
  value: string;
}
function process(data: DataPayload) {
  return data.value;
}
```

### Callback Hell

```typescript
// ❌
getUser(id, (user) => {
  getOrders(user.id, (orders) => {
    processOrders(orders, (result) => {
      sendNotification(result, () => {
        console.log("done");
      });
    });
  });
});

// ✅
const user = await getUser(id);
const orders = await getOrders(user.id);
const result = await processOrders(orders);
await sendNotification(result);
```

### Missing Optional Chaining

```typescript
// ❌
if (user && user.profile && user.profile.address && user.profile.address.city) {
}

// ✅
if (user?.profile?.address?.city) {
}
```

### Destructuring Assignment

```typescript
// ❌
const name = user.name;
const email = user.email;
const age = user.age;

// ✅
const { name, email, age } = user;
```

---
