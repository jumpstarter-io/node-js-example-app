var session = require("express-session");
var SQliteStore = require("./connect-sqlite")(session);
var express = require('express');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var swig = require("swig");
var uuid = require("uuid");
var fs = require("fs");
var crypto = require("crypto");
var app = express();

// load the jumpstarter integration lib
var jsApi = require("jumpstarterapi");

// load the sequelize db models
var models = require("./models");

// view engine setup
app.engine("html", swig.renderFile);
app.set('views', path.join(__dirname, 'views'));
app.set("view engine", "html");
app.set("view cache", false);
swig.setDefaults({cache: false});

app.use(logger('dev'));
// urlencoded is used for jumpstarter portal auth
app.use(bodyParser.urlencoded({extended: false}));
// json is used for app rest calls
app.use(bodyParser.json());
// setup the static directory
app.use(express.static(path.join(__dirname, 'public')));

// generates a secret used for signing the client cookie
// if it doesn't exist.
var getCookieSecret = function() {
    var filePath = "/app/state/todo/cookieSecret";
    if (fs.existsSync(filePath)) {
        var rawData = fs.readFileSync(filePath).toString();
        return rawData.replace(/\n/g, "");
    } else {
        var sha = crypto.createHash("sha256");
        for (var i = 0; i < 10; i++) {
            sha.update(uuid.v4());
        }
        var secret = sha.digest("hex");
        fs.writeFileSync(filePath, secret);
        return secret;
    }
};

// setup session management and use SQliteStore from connect-sqlite
app.use(session({
    store: new SQliteStore(),
    secret: getCookieSecret(),
    genid: function (req) {
        return uuid.v4();
    },
    saveUninitialized: true,
    resave: true
}));

// convenience functions for routes
var responseRedirect = function (path) {
    return function (req, res) {
        return res.redirect(path);
    };
};

var responseStatus = function (status) {
    return function (req, res) {
        return res.status(status).send();
    };
};

var loginCheck = function (failFn, okFn) {
    return function (req, res) {
        if (!req.session.logged_in) {
            return failFn(req, res);
        }
        return okFn(req, res);
    };
};

app.get("/", loginCheck(responseRedirect("/"), function (req, res) {
    return res.render("main", {homeActive: "active"});
}));

app.get("/login", loginCheck(function (req, res) {
    var loginURL = jsApi.env.user().login_url;
    return res.render("login", {loginURL: loginURL});
}, responseRedirect("/")));

// route used for reflected login or normal portal
// authentication. 
app.post("/login", loginCheck(function (req, res) {
    if ("jumpstarter-auth-token" in req.body) {
        try {
            // try to validate the client with the jumpstarter
            // integration library
            if (jsApi.validateSession(req.body["jumpstarter-auth-token"])) {
                req.session.logged_in = true;
                return res.redirect("/");
            } else {
                return res.status(403).send("Validation failed");
            }
        } catch (e) {
            return res.status(500).send("Could not login");
        }
    } else {
        return  res.status(404).send("Invalid Request");
    }
}, responseRedirect("/")));

app.get("/logout", function (req, res) {
    req.session.destroy();
    return res.redirect("/login");
});

app.get("/vista/myTodos", loginCheck(responseStatus(404), function (req, res) {
    var tasks = [];
    models.Task.findAll({
        where: {
            done: false
        },
        include: [models.SubTask],
        order: "`Task`.`id` ASC"
    }).then(function (doa) {
        for (var i = 0; i < doa.length; i++) {
            var task = doa[i].values;
            task.SubTasks = task.SubTasks.sort(function (a, b) {
                if (a.id < b.id)
                    return -1;
                if (a.id > b.id)
                    return 1;
                return 0;
            });
            task.hasSubTasks = task.SubTasks.length > 0;
            tasks.push(task);
        }
        doa = undefined;
        if (tasks.length) {
            res.render("todolist", {todos: tasks});
            tasks = undefined;
        } else {
            res.send("You have no tasks yet");
        }
    });
}));

app.post("/subtask/new", loginCheck(responseStatus(404), function (req, res) {
    var tid = req.body.tid;
    var title = req.body.title;
    models.Task.find({
        where: {id: tid}
    }).then(function (task) {
        if (task) {
            models.SubTask.create({
                title: title,
                done: false
            }).then(function (stask) {
                stask.setTask(task).then(function () {
                    res.status(200).send();
                });
            });
        } else {
            res.status(404).send();
        }
    });
}));

app.post("/subtask/complete", loginCheck(responseStatus(404), function (req, res) {
    var stid = req.body.stid;
    models.SubTask.update({
        done: true
    }, {
        where: {id: stid}
    }).then(function () {
        res.status(200).send();
    }, function () {
        res.status(500).send();
    });
}));

app.post("/task/new", loginCheck(responseStatus(404), function (req, res) {
    var title = req.body.title;
    var content = req.body.content;
    if (title && content) {
        models.Task.create({
            title: title,
            content: content,
            done: false
        }).then(function (doa) {
            res.status(200).send();
        }, function (err) {
            res.status(500).send();
        });
    } else {
        res.status(404).send();
    }
}));

app.post("/task/complete", loginCheck(responseStatus(404), function (req, res) {
    models.Task.update({
        done: true
    }, {
        where: {id: req.body.id}
    }).then(function () {
        res.status(200).send();
    }, function (err) {
        res.status(500).send();
    });
}));

module.exports = app;
