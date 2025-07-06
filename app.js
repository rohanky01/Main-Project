if(process.env.NODE_ENV != "production"){
    require("dotenv").config();
}

const cloud = require("multer-storage-cloudinary");

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");



const listingRouter = require("./routes/listings.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");


const dbUrl = process.env.ATLASDB_URL;

main().
    then((res) =>{
        console.log("connection successful");
    })
    .catch((err) =>{
        console.log(err);
    })

async function main(){
    await mongoose.connect(dbUrl);
}

app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
app.use(methodOverride("_method"));
app.use(express.urlencoded({extended:true}));
app.engine("ejs",ejsMate);
app.use(express.static(path.join(__dirname,"/public")));

const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto:{
        secret:process.env.SECRET,
    },
    touchAfter:24*60*60,
});

const sessionOptions = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie:{
        expires: Date.now()+ 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    }
}


app.use(session(sessionOptions));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

// use static serialize and deserialize of model for passport session support
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());



app.use((req,res,next) =>{
    res.locals.success = req.flash("success");
    res.locals.error  = req.flash("error");
    res.locals.currUser = req.user;
    next();
});



app.use("/listings",listingRouter);
app.use("/listings/:id/reviews",reviewRouter);
app.use("/",userRouter);


//handling error if user sends request at wrong path
app.all("*",(req,res,next) =>{
    next(new ExpressError(404,"Page not found"));
});

app.use((err,req,res,next) =>{
    let{statusCode=500,message="Something went wrong"} = err;
    res.status(statusCode).render("error.ejs",{err});
    //res.status(statusCode).send(message);
});

app.use((err,req,res,next) =>{
    if(err.status === 404){
        res.status(404);
        res.send("Page not found!");
        
        //The headers are sent after the above line
        res.set("Content-Type","text/plain");
    }
});

app.listen(8080, ()=>{
    console.log("listening at port 8080");
});