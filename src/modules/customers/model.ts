import { t } from "elysia";

export const customerParams = t.Object({
  id: t.Numeric({ minimum: 1 }),
});

export const createCustomerBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 255 }),
  phone: t.Optional(t.String({ maxLength: 32 })),
  email: t.Optional(t.String({ format: "email", maxLength: 255 })),
  notes: t.Optional(t.String()),
});

export const updateCustomerBody = t.Partial(createCustomerBody);
