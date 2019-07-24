var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");
var router = express.Router();
var mongojs = require("mongojs");
var path = require('path')


var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 3000;

// Initialize Express
var app = express();

// Configure middleware


// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));
// Use morgan logger for logging requests

//routes
app.get('/', function(req, res) {
    res.sendFile( path.resolve('public/index.html') );
});
app.get('/saved_articles', function(req, res) {
    res.sendFile( path.resolve('public/saved.html') );
});

// Connect to the Mongo DB
// mongoose.connect("mongodb://localhost/unit18Populater", { useNewUrlParser: true });
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useFindAndModify: false });




// app.get("/saved", function(req, res) {
//     res.json(path.join(__dirname, "public/saved.html"));

// A GET route for scraping the echoJS website
app.get("/scrape", function (req, res) {
    // First, we grab the body of the html with axios
    axios.get("https://www.ubergizmo.com/").then(function (response) {
        // Then, we load that into cheerio and save it to $ for a shorthand selector
        var $ = cheerio.load(response.data);

        // Now, we grab every h2 within an article tag, and do the following:
        $("div.article_card").each(function (i, element) {
            // Save an empty result object
            var result = {};

            // Add the text and href of every link, and save them as properties of the result object
            result.title = $(this)
                .children("div.article_card_title").children("a")
                .text();
            result.link = $(this)
                .children("a")
                .attr("href");

            result.content = $(this)
                .children("div.article_card_excerpt").children("p")
                .text();

            result.imgLink = $(this)
                .children("a").children("div.article_card_divimg")
                .attr("data-bg");
            // Create a new Article using the `result` object built from scraping
            db.Article.create(result)
                .then(function (dbArticle) {
                    // View the added result in the console
                    console.log(dbArticle);
                })
                .catch(function (err, doc) {
                    // If an error occurred, log it
                    console.log(err);
                });
        });

        // Send a message to the client
        res.send("Scrape Complete");
    });
});

//populate all unsaved articles
app.get("/articles", function (req, res) {
    db.Article.find({ saved: false })
        .then(function (dbArticle) {
            res.json(dbArticle);
        })
        .catch(function (err, doc) {
            res.json(err);
        })

})

//change status of the article to "saved"
app.put("/marksaved/:id", function (req, res) {
    db.Article.update(
        {
            _id: mongojs.ObjectId(req.params.id)
        },
        {
            $set: {
                saved: true
            }
        },
        function (error, edited) {
            // show any errors
            if (error) {
                console.log(error);
                res.send(error);
            }
            else {
                // Otherwise, send the result of our update to the browser
                console.log(edited);
                res.send(edited);
            }
        }
    );
});

//mark an article as not saved (delete button)
app.put("/delete/:id", function (req, res) {
    db.Article.update(
        {
            _id: mongojs.ObjectId(req.params.id)
        },
        {
            $set: {
                saved: false
            }
        },
        function (error, edited) {
            // show any errors
            if (error) {
                console.log(error);
                res.send(error);
            }
            else {
                // Otherwise, send the result of our update to the browser
                console.log(edited);
                res.send(edited);
            }
        }
    );
});

//populate all saved article
app.get("/saved", function (req, res) {
    db.Article.find({ saved: true }, function (error, found) {
        if (error) {
            console.log(error);
        }
        else {
            // Otherwise, send the books we found to the browser as a json
            res.json(found);
        }
    })

})

//router for grabbing article by id, populate it with its note
app.get('/article/:id', function (req, res) {
    db.Article.findOne({ _id: req.params.id })
        .populate("note")
        .then(function (dbArticle) {
            res.json(dbArticle);
        })
        .catch(function (err) {
            res.json(err);
        })
});

//post article's notes to database
app.post("/article/:id", function(req, res) {
    // console.log(req.body);
    db.Note.create(req.body)
    
    .then(function(dbNote){
        console.log(dbNote.body);
        return db.Article.findByIdAndUpdate ({ _id: req.params.id}, { note: dbNote._id}, {new: true});
    })
    .then(function(dbArticle){
        res.json(dbArticle);
    })
    .catch(function(err){
        res.json(err);
    });
   
});


//delete notes
app.put("/deletenote/:id", function (req, res) {
    db.Article.findByIdAndDelete({_id: req.params.id}, {note: req.params.id})
       .then (function (error, deleted) {
        // show any errors
        if (error) {
            console.log(error);
            res.send(error);
        }
        else {
            // Otherwise, send the result of our update to the browser
            console.log(deleted);
            res.send(deleted);
        }
    }) 

});





// Start the server
app.listen(PORT, function () {
    console.log("App running on port " + PORT + "!");
});
