const express = require('express');
const cors = require('cors');
const app = express();
// step 1 for jwt 
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// step 2 for jwt add cookie parser
app.use(cors());
app.use(express.json());
app.use(cookieParser());




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


    // step 3 jwt auth related api
    app.post('/jwt', async(req, res) =>{
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET , {expiresIn : '1h'});
      // step 4
      // res.send was there no wupdating cookie
      res
      .cookie('token', token, {
        httpOnly : true,
        secure : false,
        // sameSite : 'strict'
      }
      )  
      // .send(token);
      .send({sucess : true})
    });

    // get jobs
    app.get('/jobs', async(req, res)=>{
      // jobs by particualr person
        const email = req.query.email;
        let query = {};
        if(email){
          query = {hr_email : email}
        }
        const cursor = jobsCollection.find(query);
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

    // Create jobs
    app.post('/jobs', async(req, res)=>{
      const newJob = req.body;
      const result = await jobsCollection.insertOne(newJob);
      res.send(result);
    })

    // job application
    app.post('/job-applications', async(req, res) =>{
      const application = req.body;
      const { job_id, applicant_email } = application;
      // if someone already applied the job
      const existing = await jobsApplication.findOne({job_id, applicant_email});
      if(existing){
        return res.send({success : false, message : "Already Applied"});
      }

      // not the best way(best way use aggregate) how many people apply for that job
      const id = application.job_id;
      const query = { _id: new ObjectId(id)}
      const job = await jobsCollection.findOne(query);
      // console.log(job);
      let count = 0;
      if(job.applicationCount){
        count = job.applicationCount + 1;
      }
      else{
        count = 1;
      }
      // now update the joib info
      const filter = {_id: new ObjectId(id)}
      const updatedDoc = {
        $set: {
          applicationCount : count
        }
      }
      const updateResult = await jobsCollection.updateOne(filter, updatedDoc);


      const result = await jobsApplication.insertOne(application);
      res.send(result);
    });


    app.patch('/job-applications/:id', async(req, res) =>{
      const id = req.params.id;
      const data = req.body;
      const filter = {_id : new ObjectId(id)}
      const updatedDoc = {
        $set: {
          status : data.status
        }
      }
      const result = await jobsApplication.updateOne(filter, updatedDoc);
      res.send(result);
    })


    // your own applied jobs
    app.get('/job-application', async(req, res) =>{
      const email =  req.query.email;
      const query = { applicant_email : email};
      const result = await jobsApplication.find(query).toArray();

      // not the best way 
      for(const application of result){
        console.log(application.job_id);
        const query1 = {_id: new ObjectId(application.job_id)}
        const job = await jobsCollection.findOne(query1);
        if(job){
          application.title = job.title;
          application.company = job.company;
          application.jobType = job.jobType;
          application.location = job.location;
          application.company_logo = job.company_logo;
        }
      }
      res.send(result);
    });


    // get a specific job appplication id
    app.get('/job-applications/jobs/:job_id', async(req, res)=>{
      const jobId = req.params.job_id;
      const query = {job_id: jobId}
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