const express = require('express');
const multer = require('multer');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');
const MongoClient = require('mongodb').MongoClient;
const url = "mongodb://localhost:27017/gallery";
let collection = null;

//DATABASE CONNCETION
MongoClient.connect(url, { useNewUrlParser: true } ,function(err, client) {
   if(err){
      console.log("error"+err);
   }else{
      console.log("connected to db");
      const db = client.db('gallery');
      collection = db.collection('images');
      //client.close();
   }
});

//---------MIDDLEWARES---------

const storage = multer.diskStorage({
   destination: './public/uploads/',
   filename: function(req, file, cb){
      cb(null,nameFile(file));
   }
});
function nameFile(file){ 
   return "image"+Date.now() + path.extname(file.originalname);
}

const upload = multer({
   storage: storage,
   limits:{fileSize: 1000000},
   fileFilter: function(req, file, cb){
     checkFileType(file, cb);
   }
 }).single('myImage');

function checkFileType(file, cb){
   const filetypes = /jpeg|jpg|png|gif/;
   const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
   const mimetype = filetypes.test(file.mimetype);

   if(mimetype && extname){
      return cb(null,true);
   } else {
      cb('Error: Images Only!');
   }
}

//SERVER SETTINGS
const app = express();
app.set('view engine', 'ejs');
app.use(express.static('./public'));

//MAIN PAGE
app.get('/', (req, res) => {
   collection.find({}).toArray(function(err,result){
      if(err){
         console.log(err);
      } else{
         res.render('index', {images: result})
      }
   });
});

//DISPLAY UPLOAD FORM
app.get('/upload', (req, res) => {
   res.render('upload'); 
});

//DELETE SELECTED IMAGE
app.get('/delete', (req, res) => {
   //Ideally it would be a delete request
   const name = req.query.name;
   //Deleting the image file
   fs.unlink(__dirname+'/public/uploads/'+name,(err) => {
      if(err){
         console.log(err);
         return;
      }
   })
   //Remove from the database
   collection.deleteOne({filename: name}, function(err, obj){
      if(err){
         console.log(err);
      } else{
         //console.log(obj.result.n+" image deleted");
      }
   });
   //Redirect to index
   res.writeHead(302, {'Location': '/'});
   res.end();
})

//IMAGE UPLOAD
app.post('/upload',(req, res) => {
   upload(req, res, (err) => {
      if(err){
         res.render('upload', {msg : err});
      } else{
         if(req.file == undefined){
            res.render('upload', {msg: 'No file selected!'});
         } else{
            collection.insertOne(req.file, (err,result) => {
               if(err){
                  res.render('upload', {msg: err});
               } else{
                  res.render('upload', {msg: "Uploaded!"});
               }
            });
         }
      }
   });
});

//LISTENING
const port = 3000;
app.listen(port, () => console.log(`Server started on port ${port}`));