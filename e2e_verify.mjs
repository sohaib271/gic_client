import { MongoClient, ObjectId } from "./node_modules/mongodb/lib/index.js";
import bcrypt from "./node_modules/bcrypt/bcrypt.js";
const client = new MongoClient("mongodb://localhost:27017");
await client.connect();
const db = client.db("college-db");
await db.collection("users").deleteMany({ email: "e2e_verify_stu@test.com" });
const hash = bcrypt.hashSync("E2E@123", 10);
const stu = await db.collection("users").insertOne({
  specialId: "E2E_VRF_STU", email: "e2e_verify_stu@test.com", name: "V", lastName: "Stu",
  cnic: `E2EV${Date.now()}`, phone: `35${Math.floor(Math.random()*1e8)}`, role: "student",
  password: hash, department: "69bd8504f382843065aee0af", isActive: true
});
await db.collection("classes").updateOne({ className: "BS-IT-2428-CS1-IV" }, { $addToSet: { classStudents: new ObjectId(stu.insertedId) } });
console.log("STU=" + stu.insertedId);
await client.close();
