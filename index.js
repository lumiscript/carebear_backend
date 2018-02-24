// Use local .env file for env vars when not deployed
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const aws = require('aws-sdk')
const multer = require('multer')
const multerS3 = require('multer-s3')
const Expo = require('expo-server-sdk')
const bodyParser = require('body-parser')

const s3 = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: "us-east-1",
});

// Initialize multers3 with our s3 config and other options
const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_BUCKET,
    acl: 'public-read',
    metadata(req, file, cb) {
      cb(null, {fieldName: file.fieldname});
    },
    key(req, file, cb) {
      cb(null, Date.now().toString() + '.png');
    }
  })
})

// Expose the /upload endpoint
const app = require('express')();
const http = require('http').Server(app);
// parse application/json
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

app.post('/upload', upload.single('photo'), (req, res, next) => {

  res.json(req.file)
})

app.post('/pictures', (req, res, next) => {
  
  res.json(req.file)
})

app.post('/pushtoken', (req, res, next) => {
  console.log('pushtoken fired', req.body.token);
})


app.post('/push', (req, res, next) => {
  
  ////////////////////Expo Push /////////////////////////
let expo = new Expo();

// Create the messages that you want to send to clents
let messages = [];
for (let pushToken of ['ExponentPushToken[N0Wpx4E5Tvm2jNr1EYkk1o]']) {
  // Check that all your push tokens appear to be valid Expo push tokens
  if (!Expo.isExpoPushToken(pushToken)) {
    console.error(`Push token ${pushToken} is not a valid Expo push token`);
    continue;
  }
  // Construct a message (see https://docs.expo.io/versions/latest/guides/push-notifications.html)
  messages.push({
    to: pushToken,
    sound: 'default',
    body: req.body.message
  })
}

// The Expo push notification service accepts batches of notifications so
// that you don't need to send 1000 requests to send 1000 notifications. We
// recommend you batch your notifications to reduce the number of requests
// and to compress them (notifications with similar content will get
// compressed).
let chunks = expo.chunkPushNotifications(messages);

(async () => {
  // Send the chunks to the Expo push notification service. There are
  // different strategies you could use. A simple one is to send one chunk at a
  // time, which nicely spreads the load out over time:
  for (let chunk of chunks) {
    try {
      let receipts = await expo.sendPushNotificationsAsync(chunk);
      console.log(receipts);
      res.json(receipts);
    } catch (error) {
      console.error(error);
      res.json(receipts);
    }
  }
})();

////////////////////Expo Push End /////////////////////////
})



let port = process.env.PORT || 3000;
http.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
