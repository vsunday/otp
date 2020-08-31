const express = require("express"),
      passport = require("passport"),
      bodyParser = require("body-parser"),
      cookieParser = require("cookie-parser"),
      LocalStrategy = require("passport-local").Strategy,
      path = require("path"),
      {v4: uuidv4} = require("uuid");

const app = express();
const port = process.env.PORT || 8080;
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(require("express-session")({
  secret: "Nothing but clowns",
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(
  (username, password, done) => {
    console.log("passport local", username, password);
    if (isValid(username, password)) {
      done(null, username);
    } else {
      return done(null, false, {msg: "Incorrect username or password"});
    }
}));
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

const users = [
  {
    username: "test01",
    password: "test0123",
    email: "test01@example.com"
  },
  {
    username: "test02",
    password: "test0123",
    email: "test02@example.com"
  }];
  
function searchUser(username) {
  for (let i=0; i<users.length; i++) {
    if (users[i]["username"] == username) {
      return users[i];
    }
  }
  return undefined;
}
  
function isValid(username, password) {
  const user = searchUser(username);
  return (user) ? user["password"] == password :false;
}

const otpusers = [{
    // code: "123",
    // username: "test01",
    // expire: new Date("2020/10/1")
}];

function searchOtpUser(code) {
  for (let i=0; i<otpusers.length; i++) {
    if (otpusers[i]["code"] == code) {
      return otpusers.splice(i, 1)[0];
    }
  }
  return undefined;
}

function addOtpUser(username) {
  const code = uuidv4().replace(/-/gi, '');
  otpusers.push({
    code: code,
    username: username,
    expire: new Date((new Date()).getTime() + 3600*1000)
  });
  console.log(code);
}

app.get("/", (req, res) => {
  res.redirect("/login");
});

app.get("/*.html", (req, res) => {
  res.redirect("/login");
});

app.get("/login", (req, res) => {
  console.log("/login get");
  res.sendFile(path.join(__dirname + "/public/login.html"));
});

app.post("/login", passport.authenticate("local", {
  failureRedirect: "/login?msg=failureRedirect"
}), (req, res) => {
  console.log("/login post");
  if (req.cookies["username"] == req.user) {
    res.redirect("/menu");
  } else {
    res.redirect(307, "/otp");
  }
});

app.get("/menu", isLoggedIn, (req, res) => {
  console.log("/menu");
  res.sendFile(path.join(__dirname + "/public/menu.html"));
});

app.get("/username", isLoggedInApi, (req, res) => {
  res.send({response: req.user});
});

app.get("/email", isLoggedInApi, (req, res) => {
  res.send({response: searchUser(req.user)["email"]});
  
});

app.get("/otp", (req, res, next) => {
  const code = req.query.code;
  const user = searchOtpUser(code);
  if (user && user["expire"] > new Date()) {
    console.log("here");
    req.body.username = user["username"];
    req.body.password = searchUser(user["username"])["password"];
    next();
  } else {
    res.redirect("/login");
  }
}, passport.authenticate("local", {
  failureRedirect: "/login?msg=failureRedirect"
}), (req, res) => {
  console.log("/login post");
  // write cookie
  res.cookie('username', req.user, {
    maxAge: 365*24*60*60
  });
  res.redirect("/menu");
});

app.post("/otp", isLoggedIn, (req, res) => {
  const username = req.user;
  addOtpUser(username);
  res.sendFile(path.join(__dirname + "/public/otp.html"));
});

app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/login");
});

app.get("/code", isLoggedInApi, (req, res) => {
  for (let i=0; i<otpusers.length; i++) {
    if (otpusers[i]["username"] == req.user) {
      res.send({response: otpusers[i]["code"]});
      return;
    }
  }
  res.send({response: undefined});
});

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login?msg=notauthenticated");
}
function isLoggedInApi(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.send({response: undefined});
}
app.use("/", express.static("public"));

app.listen(port, () => {console.log(`listening on ${port}`)});