const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const port = process.env.PORT || 5000;
const app = express();
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}));


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.c8drypi.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});



// customized middleware

const logged= async(req, res, next) => {
  console.log('Called', req.host, req.originalUrl);
  next();

}
const verifyToken= async(req, res, next) => {
  const token = req.cookies?.token;
  console.log("tok tok token:", token)
  if(!token){
    return res.status(401).send({message: "Forbidden"});
  }
  // jwt.verify(token, secretOrPublicKey, [options, callback])
  jwt.verify(token, process.env.SECRET_TOKEN, (err, decoded)=>{
    if(err){
      console.log(err);
      return res.status(401).send({message: "Unauthorized"});
    }

    console.log("Access token is Decoded:", decoded)

    req.user = decoded;
    next();

  })
 

}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db('carDoctor').collection('services');
    const collectionBookings = client.db('carDoctor').collection('bookings');

    // Auth related api methods

    app.post('/jwt', async (req, res) => {
        const user = req.body;
        
        console.log(user);
        const token = jwt.sign(user, process.env.SECRET_TOKEN, {expiresIn:'1h'})
        

        res
        .cookie('token', token,{
          httpOnly: true,
          secure: false,
          

        })
        .send({success: true});

        })
    


    // service related api methods
    app.get('/services', async(req, res)=>{
        const cursor =  serviceCollection.find();
        const result = await cursor.toArray();
        res.send(result);
    })

    app.get('/services/:id', async(req, res)=>{ 
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const result = await serviceCollection.findOne(query);
        res.send(result);
    })
    app.post('/bookings',  async(req, res)=>{
      const bookings = req.body;
      
      const result = await collectionBookings.insertOne(bookings);
      res.send(result);
    });

    // bookings Cart for user
    app.get('/bookings',logged, verifyToken, async(req, res)=>{
      
      console.log(req.cookies.token)
      if(req.query.email !== req.user.email){
        return res.status(403).send({message: "Forbidden Access"});
      }
      let query = {};
      if(req.query?.email){
        query = {email : req.query.email}
      }
        const result = await collectionBookings.find(query).toArray();
        res.send(result);

    })

    // Update booking service
    app.patch('/bookings/:id', async (req, res) => {
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)};
        const bookingInfo = req.body;
        const updateDoc = {
      $set: {
        status: bookingInfo.status
      },
      
      
    };
    const result = await collectionBookings.updateOne(filter, updateDoc);
    res.send(result);
    })

    // delete booking service
    
    app.delete('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await collectionBookings.deleteOne(query);
      res.send(result);
    })
  
    




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res)=>{

    res.send("car-doctor is running");

})

app.listen(port, ()=>{
    console.log(`car-doctor is listening on port ${port}`);
});


