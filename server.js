const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
var bodyParser = require("body-parser");
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});

//my code
//create model
let sessionSchema = new mongoose.Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: String
});

let userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  log: [sessionSchema]
});

let Session = mongoose.model("Session", sessionSchema);
let User = mongoose.model("User", userSchema);

let result = {};

//create a new user
app.post(
  "/api/exercise/new-user",
  bodyParser.urlencoded({ extended: false }),
  (req, res) => {
    let newUser = new User({ username: req.body.username });
    newUser.save((err, savedUser) => {
      if (!err) {
        result["username"] = savedUser.username;
        result["_id"] = savedUser.id;
        res.json(result);
      }
    });
  }
);

//get an array of all users
app.get("/api/exercise/users", (req, res) => {
  User.find({}, (err, foundUsers) => {
    if (err) {
      res.json("users don't exist")
    } else {
      res.json(foundUsers);
    }
  });
});

//add exercise log
app.post(
  "/api/exercise/add",
  bodyParser.urlencoded({ extended: false }),
  (req, res) => {
    let newSession = new Session({
      description: req.body.description,
      duration: parseInt(req.body.duration),
      date: req.body.date
    });
    
    //if the date is empty, get current date
    if (newSession === "") {
      newSession.date = new Date().toISOString().substring(0, 10)
    }

    User.findByIdAndUpdate(
      req.body.userId,
      { $push: { log: newSession } },
      { new: true },
      (err, updatedUser) => {
        if (err){
          res.json("matching ID doesn't exist")
        
        } else {
          result["_id"] = updatedUser.id;
          result["username"] = updatedUser.username;
          result["date"] = new Date(newSession.date).toDateString();
          result["duration"] = newSession.duration;
          result["description"] = newSession.description;

          res.json(result);
        }
      }
    );
  }
);

//retrieve retrieve a full exercise log from id, also date from, to, and limit of numbers 
app.get("/api/exercise/log", (req, res) => {
  User.findById(req.query.userId, (err, foundItem) => {
    if (err){
      res.json("user not found")
    } else {
      if (req.query.from || req.query.to) {
        let dateFrom = new Date(0);
        let dateTo = new Date();

        if (req.query.from) {
          dateFrom = new Date(req.query.from);
        }

        if (req.query.to) {
          dateTo = new Date(req.query.to);
        }

        dateFrom = dateFrom.getTime();
        dateTo = dateTo.getTime();

        foundItem.log = foundItem.log.filter(session => {
          let sessionDate = new Date(session.date).getTime();
          return sessionDate >= dateFrom && sessionDate <= dateTo;
        });
      }

      if (req.query.limit) {
        foundItem.log = foundItem.log.slice(0, req.query.limit);
      }

      result["_id"] = foundItem.id;
      result["username"] = foundItem.username;
      result["count"] = foundItem.log.length;
      result["log"] = foundItem.log;
      res.json(result);
    }
  });
});
