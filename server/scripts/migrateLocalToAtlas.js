const dotenv = require("dotenv");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

dotenv.config();

const SOURCE_MONGODB_URI = process.env.SOURCE_MONGODB_URI;
const TARGET_MONGODB_URI = process.env.TARGET_MONGODB_URI || process.env.MONGODB_URI;
const REPORT_PATH = path.join(__dirname, "..", "migration-report.json");

const connect = async (uri) => {
  console.log(`Connecting to ${uri.startsWith("mongodb+srv") ? "target" : "source"} database...`);
  const connection = mongoose.createConnection(uri, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
    socketTimeoutMS: 30000,
  });

  await connection.asPromise();
  console.log(`Connected to ${uri.startsWith("mongodb+srv") ? "target" : "source"} database.`);
  return connection;
};

const copyCollection = async (sourceDb, targetDb, collectionName) => {
  const sourceCollection = sourceDb.collection(collectionName);
  const targetCollection = targetDb.collection(collectionName);

  const oldDocumentCount = await sourceCollection.countDocuments();
  const documents = await sourceCollection.find({}).toArray();

  await targetCollection.drop().catch(() => {});
  await targetDb.createCollection(collectionName).catch(() => {});

  if (documents.length) {
    await targetCollection.insertMany(documents, { ordered: false });
  }

  const indexes = await sourceCollection.indexes();
  const targetIndexes = indexes
    .filter((index) => index.name !== "_id_")
    .map(({ key, name, unique, sparse, expireAfterSeconds, partialFilterExpression, collation, hidden }) => {
      const definition = { key, name };

      if (unique !== undefined) definition.unique = unique;
      if (sparse !== undefined) definition.sparse = sparse;
      if (expireAfterSeconds !== undefined) definition.expireAfterSeconds = expireAfterSeconds;
      if (partialFilterExpression !== undefined) definition.partialFilterExpression = partialFilterExpression;
      if (collation !== undefined) definition.collation = collation;
      if (hidden !== undefined) definition.hidden = hidden;

      return definition;
    });

  if (targetIndexes.length) {
    await targetCollection.createIndexes(targetIndexes);
  }

  const newDocumentCount = await targetCollection.countDocuments();

  return {
    collectionName,
    oldDocumentCount,
    newDocumentCount,
    indexes: targetIndexes.length,
    status: oldDocumentCount === newDocumentCount ? "matched" : "mismatch",
  };
};

const main = async () => {
  if (!SOURCE_MONGODB_URI) {
    throw new Error("SOURCE_MONGODB_URI is required for migration.");
  }

  if (!TARGET_MONGODB_URI) {
    throw new Error("TARGET_MONGODB_URI or MONGODB_URI is required.");
  }

  const sourceConnection = await connect(SOURCE_MONGODB_URI);
  const targetConnection = await connect(TARGET_MONGODB_URI);

  try {
    const sourceDb = sourceConnection.db;
    const targetDb = targetConnection.db;
    const collections = await sourceDb.listCollections({}, { nameOnly: true }).toArray();
    console.log(`Found ${collections.length} collections to inspect.`);

    const summary = [];
    for (const { name } of collections) {
      if (name.startsWith("system.")) {
        continue;
      }

      summary.push(await copyCollection(sourceDb, targetDb, name));
    }

    const report = {
      sourceDatabase: sourceDb.databaseName,
      targetDatabase: targetDb.databaseName,
      collections: summary,
      generatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

    console.log("Migration report:");
    for (const item of summary) {
      console.log(
        `- ${item.collectionName}: old=${item.oldDocumentCount}, new=${item.newDocumentCount}, status=${item.status}`
      );
    }
    console.log(`Report written to ${REPORT_PATH}`);
  } finally {
    await sourceConnection.close();
    await targetConnection.close();
  }
};

main().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exitCode = 1;
});
