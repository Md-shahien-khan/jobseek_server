const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();

const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7inkfjv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");


    // Job Related API
    const jobsCollection = client.db('jobseek').collection('jobs');
    const jobsApplication = client.db('jobseek').collection('job_application');

    // get jobs
    app.get('/jobs', async(req, res)=>{
        const cursor = jobsCollection.find();
        const result = await cursor.toArray();
        res.send(result);
    });

    // specific jobs
    app.get('/jobs/:id', async(req, res) =>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const result = await jobsCollection.findOne(query);
        res.send(result);
    });

    // job application
    app.post('/job-applications', async(req, res) =>{
      const application = req.body;
      const { job_id, applicant_email } = application;
      // if someone already applied the job
      const existing = await jobsApplication.findOne({job_id, applicant_email});
      if(existing){
        return res.send({success : false, message : "Already Applied"});
      }
      const result = await jobsApplication.insertOne(application);
      res.send(result);
    });


    // your own applied jobs
    app.get('/job-application', async(req, res) =>{
      const email =  req.query.email;
      const query = { applicant_email : email};
      const result = await jobsApplication.find(query).toArray();
      res.send(result);
    })


    // check if the user already applied for that job
    // app.get('/job-applicatio/check', async(req, res) =>{
    //   const {job_id, email} = req.body;
    //   if(!job_id || !email){
    //     return res.status(400).send({applied : false});
    //   }
    //   const existing = await jobsApplication.findOne({job_id, applicant_email : email});
    //   res.send({applied : !existing});
    // })



  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) =>{
    res.send('Job server is there')
});

app.listen(port, () =>{
    console.log(`Job is waiting at : ${port}`);
});