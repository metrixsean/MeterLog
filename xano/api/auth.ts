import { apiGroup, query, input, s, ref, inp, c, expr, expect, resp } from "@xano/sdk";
import { households, users } from "../tables.js";

export const authApi = apiGroup({ name: "auth", canonical: "auth" });

export const signup = query({
  name: "signup",
  verb: "POST",
  apiGroup: authApi,
  input: {
    email: input.email({ required: true }),
    password: input.text({ required: true, sensitive: true }),
    household_name: input.text({ required: true }),
  },
  stack: [
    s.db.has({ table: users, fieldName: "email", fieldValue: inp("email"), as: "taken" }),
    s.precondition({
      expr: expr(ref("taken"), "=", c.bool(false)),
      error_type: "badrequest",
      error: c.text("Email already registered."),
    }),
    s.db.add({ table: households, row: { name: inp("household_name") }, as: "household" }),
    s.db.add({
      table: users,
      row: { household_id: ref("household.id"), email: inp("email"), password: inp("password") },
      as: "user",
    }),
    s.security.create_auth_token({ table: users, id: ref("user.id"), as: "token" }),
  ],
  response: { token: ref("token"), household_id: ref("household.id") },
  tests: [
    {
      name: "creates household and token",
      input: {
        email: c.text("a@example.com"),
        password: c.text("correct horse"),
        household_name: c.text("Flat 1"),
      },
      expect: [expect.to_be_defined(resp("token"))],
    },
  ],
});

export const login = query({
  name: "login",
  verb: "POST",
  apiGroup: authApi,
  input: {
    email: input.email({ required: true }),
    password: input.text({ required: true, sensitive: true }),
  },
  stack: [
    s.db.get({
      table: users,
      fieldName: "email",
      fieldValue: inp("email"),
      output: ["id", "household_id", "password"],
      as: "u",
    }),
    s.precondition({
      expr: expr(ref("u", { safe: true }), "!=", c.null()),
      error_type: "unauthorized",
      error: c.text("Invalid email or password."),
    }),
    s.security.check_password({
      text_password: inp("password"),
      hash_password: ref("u.password"),
      as: "ok",
    }),
    s.precondition({
      expr: expr(ref("ok"), "=", c.bool(true)),
      error_type: "unauthorized",
      error: c.text("Invalid email or password."),
    }),
    s.security.create_auth_token({ table: users, id: ref("u.id"), as: "token" }),
  ],
  response: { token: ref("token"), household_id: ref("u.household_id") },
});
