const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bodyParser = require('body-parser');
require('dotenv').config();
const mongodb = process.env.MONGO_URI;
mongoose.connect(mongodb, { useNewUrlParser: true, useUnifiedTopology: true });

const exerciseSchema = new Schema({
  description: String,
  duration: Number,
  date: String
});

const userSchema = new Schema({
  username: String,
  exercises: [exerciseSchema]
});
let User = mongoose.model('User', userSchema);


app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});
app.use(
  bodyParser.urlencoded({extended: false})
);

app.post('/api/users', async function(req, res) {
  let newUsername = req.body.username;
  let existingUser = await User.findOne({ username: newUsername });
  if (existingUser) {
    return res.status(400).send({ message: "Username already exists." });
  }
  let newUser = new User({
    username: newUsername
  });
  try {
    let savedUser = await newUser.save();
    res.json({ username: savedUser.username, _id: savedUser._id});
  } catch (err) {
    res.status(500).send({ error: "An error occurred while creating user." });
  }      
});

app.get('/api/users', async function(req, res) {
  try {
    const users = await User.find({}).select('username _id');
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while fetching users.");
  }
});

app.post('/api/users/:_id/exercises', async function(req, res) {
  const userId = req.params._id;
  const description = req.body.description;
  const duration = req.body.duration;
  let date = req.body.date;
  if (!date) {
    date = new Date().toDateString();
  } else {
    date = new Date(date).toDateString();
  }
    const updatedUser = await User.findByIdAndUpdate(userId, 
      { $push: { exercises: { description, duration: Number(duration), date } } },
      { new: true }
      );
    res.json({ 
      username: updatedUser.username,
      description: description,
      duration: Number(duration),
      date: date,
      _id: userId
    });
  });

app.get('/api/users/:_id/logs', async function(req, res) {
  const userId = req.params._id;
  const foundUser = await User.findById(userId);
  if (!foundUser) {
    return res.status(404).send({ message: "User not found" });
  }
  const exercisesCount = foundUser.exercises.length;
  const fromQuery = req.query.from ? new Date(req.query.from) : null; //date
  const toQuery = req.query.to ? new Date(req.query.to) : null; //date
  const limitQuery = parseInt(req.query.limit, 10); //number
  let exercises = foundUser.exercises;

  if (fromQuery || toQuery) {
    exercises = exercises.filter(exercise => {
      const exerciseDate = new Date(exercise.date);
      return (!fromQuery || exerciseDate >= fromQuery) && (!toQuery || exerciseDate <= toQuery);
    });
  }

  if(!isNaN(limitQuery)) {
    exercises = exercises.slice(0, limitQuery);
  }

  const formattedExercises = exercises.map(exercise => ({
    description: exercise.description,
    duration: exercise.duration,
    date: exercise.date
  }));

  res.json({
    username: foundUser.username,
    count: exercisesCount,
    _id: userId,
    log: formattedExercises
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
