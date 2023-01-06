const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5001;

//middleware
app.use(cors());
app.use(express.json());

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access')
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({message: err.message});
        }
        req.decoded = decoded;
        next();
    })
}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.rtntsud.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    const appointmentOptionsCollection = client
      .db("doctorsPortal")
      .collection("appointmentOptions");
    const bookingCollection = client.db("doctorsPortal").collection("bookings");
      const userCollection = client.db("doctorsPortal").collection("users");
      const doctorCollection = client.db("doctorsPortal").collection("doctors")

    //use Aggregate to query multiple collection
    app.get("/appointmentOptions", async (req, res) => {
      const date = req.query.date;
      console.log(date);
      const query = {};
      const options = await appointmentOptionsCollection.find(query).toArray();
      const bookingQuery = { appointmentDate: date };
      const alreadyBooked = await bookingCollection
        .find(bookingQuery)
        .toArray();
      options.forEach((option) => {
        const optionBooked = alreadyBooked.filter(
          (book) => book.treatment === option.name
        );
        const bookedSlots = optionBooked.map((book) => book.slot);
        const remainingSlots = option.slots.filter(
          (slot) => !bookedSlots.includes(slot)
        );
        option.slots = remainingSlots;
      });
      res.send(options);
    });
      
      app.get("/appointmentSpecialty", async (req, res) => {
          const query = {};
          const result = await appointmentOptionsCollection.find(query).project({ name: 1 }).toArray();
          res.send(result);
    })
      

    app.get("/bookings",verifyJWT, async (req, res) => {
      const email = req.query.email;
        const decodedEmail = req.decoded.email;
        if (decodedEmail !== email) {
            return res.status(403).send({message:"Forbidden access"})
        }
      const query = {
        email: email,
      };
      const bookings = await bookingCollection.find(query).toArray();
      res.send(bookings);
    });

      app.get("/users", async (req, res) => {
          const query = {};
          const users = await userCollection.find(query).toArray();
          res.send(users);
     })   
      
    app.post("/bookings", async (req, res) => {
      const booking = req.body;

      const query = {
        email: booking.email,
        appointmentDate: booking.appointmentDate,
        treatment: booking.treatment,
      };
      const alreadyBooked = await bookingCollection.find(query).toArray();
      if (alreadyBooked.length > 0) {
        const message = "You already have  a booking";
        return res.send({ acknowledged: false, message: message });
      }
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get("/jwt", async (req, res) => {
        const email = req.query.email;
        const query = {
            email: email
        }
        const user = await userCollection.findOne(query);
        if (user) {
            const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1d' });
            return res.send({accessToken: token});
        }
        res.status(401).send({accessToken: ''})
    });
      
      //make admin
      app.put('/users/admin/:id', verifyJWT, async (req, res) => {
          const decodedEmail = req.decoded.email;
          const query = {
              email: decodedEmail
          }
          const user = await userCollection.findOne(query);
          if (user?.role !== 'admin') {
              return res.status(403).send({message: 'Forbidden access'})
          }
          const id = req.params.id;
          const filter = {
              _id: ObjectId(id)
          };
          const updateDoc = {
              $set: {
                  role: 'admin'
              }
          }
          const options = { upsert: true };
          const result = await userCollection.updateOne(filter, updateDoc, options);
          res.send(result);
      })
      
      //check admin
      app.get('/users/admin/:email', async (req, res) => {
          const email = req.params.email;
          const query = {
              email
          };
          const user = await userCollection.findOne(query);
          console.log({ isAdmin: user?.role === 'admin' })
          res.send({ isAdmin: user?.role === 'admin' });
          
      })

      //add doctor
      app.post("/doctors",  async (req, res) => {
        //   const decodedEmail = req.decoded.email;
        //   const query = {
        //     email: decodedEmail
        //   }
        //   const user = await userCollection.findOne(query);
        //   if (user?.role !== 'admin') {
        //     return res.status(403).send({message: 'Forbidden access'})
        // }
          const doctor = req.body;
          const result = await doctorCollection.insertOne(doctor);
          res.send(result);
      })
    
    //get doctors
    app.get('/doctors', async (req, res) => {
      const query = {};
      const doctors = await doctorCollection.find(query).toArray();
      res.send(doctors)
    })
      
  } finally {
  }
}
run().catch((err) => {
  console.log(err);
});

app.get("/", (req, res) => {
  res.send("Doctors portal server is running");
});

app.listen(port, () => {
  console.log("Doctors Portal running on", port);
});
