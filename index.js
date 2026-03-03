const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const admin = require("firebase-admin");
const port = process.env.PORT || 3000;
console.log(process.env);

const serviceAccount = require("./smart-deal-firebase-adminsdk.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

//midelwre
app.use(cors());
app.use(express.json());

const logger = (req, res, next) => {
  console.log("logging info");
  next();
};

const verifyFireBaseToken = async (req, res, next) => {
  console.log("in the verify middleware", req.headers.authorization);
  if (!req.headers.authorization) {
    return res.status(401).send({ message: "unauthorized acces" });
  }
  const token = req.headers.authorization.split(" ")[1];
  if (!token) {
    return res.status(401).send({ message: "unauthorized acces" });
  }

  try {
    const userInfo = await admin.auth().verifyIdToken(token);
    req.token_email = userInfo.email;
    console.log("after token validation", userInfo);
    next();
  } catch {
    return res.status(401).send({ message: "unauthorized acces" });
  }
  // next();
};

const verifyJWTToken = async(req, res, next) => {
  // console.log('in middeleware',req.headers);
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ message: "unauthorized acces" });
  }
  const token = authorization.split(" ")[1];
  if (!token) {
    return res.status(401).send({ message: "unauthorized acces" });
  }

  // 
  jwt.verify(token, process.env.JWT_SERECT, (err, decoded) =>{
    if(err){
      return res.status(401).send({ message: "unauthorized acces" });
    }
    console.log('after decoded', decoded);
    req.token_email = decoded.email;
      next();
  })

}

// mongodb uri and client setup

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tav8afj.mongodb.net/?appName=Cluster0`;

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

    const bidsCollection = db.collection("bids");

    const usersCollection = db.collection("users");

    // jwt related api
    app.post("/getToken", (req, res) => {
      const loggedUser = req.body;
      const token = jwt.sign(loggedUser, process.env.JWT_SERECT, {
        expiresIn: "1h",
      });
      res.send({ token: token });
    });

    //users post
    app.post("/users", async (req, res) => {
      const newUser = req.body;

      const email = req.body.email;
      const query = { email: email };
      const existinggUser = await usersCollection.findOne(query);
      if (existinggUser) {
        res.send({
          message: "user already exits. do not need to insert again",
        });
      } else {
        const result = await usersCollection.insertOne(newUser);
        res.send(result);
      }
    });

    // prudect get kora al
    app.get("/products", async (req, res) => {
      // const projectFields = { title: 1, price_min:1, price_max: 1, image: 1 };
      // const cursor = productCollection.find().sort({price_min:-1}).limit(2).limit(5).project(projectFields);
      console.log(req.query);
      const cursor = productCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/latest-products", async (req, res) => {
      const cursor = productCollection.find().sort({ created_at: -1 }).limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });
    // product specific product get koraa
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
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
    app.patch("/products/:id", async (req, res) => {
      const id = req.params.id;
      const updatedProudect = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: updatedProudect,
      };
      const result = await productCollection.updateOne(query, update);
      res.send(result);
    });

    // product delete kor
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.send(result);
    });

    //bids related api
    // app.get("/bids", logger,verifyFireBaseToken, async (req, res) => {
    // console.log('header', req.headers)
    //   const email = req.query.email;

    //   const query = {};
    //   if (email) {
    //     if(email !== req.token_email){
    //       return res.status(403).send({message: 'forbidden access'})
    //     }
    //     query.buyer_email = email;
    //   }
    //   const cursor = bidsCollection.find(query);
    //   const result = await cursor.toArray();
    //   res.send(result);
    // });

    app.get("/bids",verifyJWTToken, async (req, res) => {
      // console.log('headers', req.headers)
      const email = req.query.email;
      const query = {};
      if(email){
        query.buyer_email = email;
      }

      if(email !== req.token_email){
          return res.status(403).send({message: 'forbidden access'});

      }
     
      const cursor = bidsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get(
      "/products/bids/:productId",
      verifyFireBaseToken,
      async (req, res) => {
        const productId = req.params.productId;
        const query = { product: productId };
        const cursor = bidsCollection.find(query).sort({ bid_price: -1 });
        const result = await cursor.toArray();
        res.send(result);
      },
    );

    app.delete("/bids/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bidsCollection.deleteOne(query);
      res.send(result);
    });

    app.post("/bids", async (req, res) => {
      const newBids = req.body;
      const result = await bidsCollection.insertOne(newBids);
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
