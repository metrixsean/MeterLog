import { apiGroup, query, input, s, ref, inp, auth, c, col, expr, guard, expect, resp } from "@xano/sdk";
import { households, users } from "../tables.js";

export const householdApi = apiGroup({ name: "household", canonical: "household" });

export const getHousehold = query({
  name: "household",
  verb: "GET",
  apiGroup: householdApi,
  auth: users,
  stack: [
    s.db.get({
      table: users,
      fieldName: "id",
      fieldValue: auth("id"),
      as: "me",
      mock: { "lists own household": c.obj({ id: 1, household_id: 5 }) },
    }),
    s.db.get({
      table: households,
      fieldName: "id",
      fieldValue: ref("me.household_id"),
      as: "household",
      mock: { "lists own household": c.obj({ id: 5, name: "Flat 1" }) },
    }),
    guard.found("household", { message: "Household not found." }),
    s.db.query({
      table: users,
      where: expr(col("household_id"), "=", ref("me.household_id")),
      sort: [{ sortBy: "created_at", dir: "asc" }],
      output: ["id", "email", "created_at"],
      as: "members",
      mock: {
        "lists own household": c.array([
          { id: 1, email: "a@example.com", created_at: 0 },
          { id: 2, email: "b@example.com", created_at: 0 },
        ]),
      },
    }),
  ],
  response: {
    id: ref("household.id"),
    name: ref("household.name"),
    me: ref("me.id"),
    members: ref("members"),
  },
  tests: [
    {
      name: "lists own household",
      expect: [
        expect.to_equal(resp("name"), c.text("Flat 1")),
        expect.to_equal(resp("me"), c.int(1)),
        expect.to_equal(resp("members.1.email"), c.text("b@example.com")),
      ],
    },
  ],
});

export const renameHousehold = query({
  name: "household",
  verb: "PATCH",
  apiGroup: householdApi,
  auth: users,
  input: { name: input.text({ required: true }) },
  stack: [
    s.db.get({
      table: users,
      fieldName: "id",
      fieldValue: auth("id"),
      as: "me",
      mock: { "renames own household": c.obj({ id: 1, household_id: 5 }) },
    }),
    s.db.edit({
      table: households,
      fieldValue: ref("me.household_id"),
      row: { name: inp("name") },
      as: "household",
      mock: { "renames own household": c.obj({ id: 5, name: "Flat 2" }) },
    }),
  ],
  response: ref("household"),
  tests: [
    {
      name: "renames own household",
      input: { name: c.text("Flat 2") },
      expect: [expect.to_equal(resp("id"), c.int(5)), expect.to_equal(resp("name"), c.text("Flat 2"))],
    },
  ],
});

const ME = { id: 1, household_id: 5 };
const MEMBER = { id: 2, email: "b@example.com", household_id: 5 };

export const removeMember = query({
  name: "household/members/{user_id}",
  verb: "DELETE",
  apiGroup: householdApi,
  auth: users,
  input: { user_id: input.int({ required: true }) },
  stack: [
    s.db.get({
      table: users,
      fieldName: "id",
      fieldValue: auth("id"),
      as: "me",
      mock: {
        "removes member of own household": c.obj(ME),
        "other household is not found": c.obj(ME),
        "cannot remove yourself": c.obj(ME),
      },
    }),
    guard.require(expr(inp("user_id"), "!=", ref("me.id")), {
      errorType: "badrequest",
      message: "You cannot remove yourself.",
    }),
    s.db.get({
      table: users,
      fieldName: "id",
      fieldValue: inp("user_id"),
      output: ["id", "email", "household_id"],
      as: "member",
      mock: {
        "removes member of own household": c.obj(MEMBER),
        "other household is not found": c.obj({ ...MEMBER, household_id: 6 }),
      },
    }),
    guard.found("member", { message: "Member not found." }),
    guard.require(expr(ref("member.household_id"), "=", ref("me.household_id")), {
      errorType: "notfound",
      message: "Member not found.",
    }),
    s.db.del({ table: users, fieldValue: inp("user_id"), mock: { "removes member of own household": c.null() } }),
  ],
  response: { id: ref("member.id"), email: ref("member.email") },
  tests: [
    {
      name: "removes member of own household",
      input: { user_id: c.int(2) },
      expect: [expect.to_equal(resp("id"), c.int(2))],
    },
    {
      name: "other household is not found",
      input: { user_id: c.int(2) },
      expect: [expect.to_throw(c.text("Member not found."))],
    },
    {
      name: "cannot remove yourself",
      input: { user_id: c.int(1) },
      expect: [expect.to_throw(c.text("You cannot remove yourself."))],
    },
  ],
});
