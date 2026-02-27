const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;

//midelwre
app.use(cors());
app.use(express.json());

// mongodb uri and client setup
const uri =
  "mongodb+srv://smartdb:XN4qMtuSsLrHvG4b@cluster0.tav8afj.mongodb.net/?appName=Cluster0";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// mongodb functionly .....

async function run() {
  try {
    await client.connect();

    const db = client.db("samrt_bd");
    const productCollection = db.collection("products");

// prudect get kora al
    app.get("/products", async (req, res) => {
      const cursor = productCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
// product specific product get koraa
     app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await productCollection.findOne(query);
      res.send(result);
    });

    // product post kora
    app.post("/products", async (req, res) => {
      const newProduct = req.body;
      const result = await productCollection.insertOne(newProduct);
      res.send(result);
    });

    // product update kora
    app.patch("/products/:id", async(req, res) => {
      const id = req.params.id;
      const updatedProudect = req.body;
      const query = {_id: new ObjectId(id)};
      const update = {
        $set: updatedProudect
      }
      const result = await productCollection.updateOne(query,update);
      res.send(result);
    });

    // product delete kor 
    app.delete("/products/:id", async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await productCollection.deleteOne(query);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Smart server is Running");
});

app.listen(port, () => {
  console.log(`smart server listening on port ${port}`);
});
