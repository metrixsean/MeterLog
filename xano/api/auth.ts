import { apiGroup, query, input, s, ref, inp, c, expr, expect, resp, auth } from "@xano/sdk";
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

const inviteMe = {
  "adds user to own household": c.obj({ id: 1, household_id: 5 }),
  "rejects taken email": c.obj({ id: 1, household_id: 5 }),
};
const inviteInput = { email: c.text("b@example.com"), password: c.text("correct horse") };

export const invite = query({
  name: "invite",
  verb: "POST",
  apiGroup: authApi,
  auth: users,
  input: {
    email: input.email({ required: true }),
    password: input.text({ required: true, sensitive: true }),
  },
  stack: [
    s.db.get({ table: users, fieldName: "id", fieldValue: auth("id"), as: "me", mock: inviteMe }),
    s.db.has({
      table: users,
      fieldName: "email",
      fieldValue: inp("email"),
      as: "taken",
      mock: { "adds user to own household": c.bool(false), "rejects taken email": c.bool(true) },
    }),
    s.precondition({
      expr: expr(ref("taken"), "=", c.bool(false)),
      error_type: "badrequest",
      error: c.text("Email already registered."),
    }),
    s.db.add({
      table: users,
      row: { household_id: ref("me.household_id"), email: inp("email"), password: inp("password") },
      as: "user",
      mock: { "adds user to own household": c.obj({ id: 2, email: "b@example.com", household_id: 5 }) },
    }),
  ],
  response: { id: ref("user.id"), email: ref("user.email"), household_id: ref("user.household_id") },
  tests: [
    {
      name: "adds user to own household",
      input: inviteInput,
      expect: [expect.to_equal(resp("household_id"), c.int(5))],
    },
    {
      name: "rejects taken email",
      input: inviteInput,
      expect: [expect.to_throw(c.text("Email already registered."))],
    },
  ],
});
