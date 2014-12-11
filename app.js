var session = require("express-session");
var SequelizeStore = require("./connect-sequelize")(session);
var express = require('express');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var swig = require("swig");
var uuid = require("uuid");
var fs = require("fs");
var crypto = require("crypto");
var app = express();

var mode = process.env.NODE_ENV || "production";
var isDevMode = (mode === "development");
// load the jumpstarter integration lib
var jsApi = null;
try {
    jsApi = require("jumpstarterapi");
} catch (e) {}

// load the sequelize db models
var models = require("./models");

// view engine setup
app.engine("html", swig.renderFile);
app.set('views', path.join(__dirname, 'views'));
app.set("view engine", "html");
app.set("view cache", !isDevMode);
swig.setDefaults({cache: isDevMode? false: 'memory'});

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
    var pathPrefix = (isDevMode)? __dirname: "/app/state/todo/",
        filePath = path.join(pathPrefix, "cookieSecret");
    if (!fs.existsSync(pathPrefix)) {
	fs.mkdirSync(pathPrefix);
    }
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
    store: new SequelizeStore(),
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
        if (!req.session.logged_in && !isDevMode) {
            return failFn(req, res);
        }
        return okFn(req, res);
    };
};

var getEmailMD5 = function() {
    var email = (!isDevMode)? jsApi.env.user().email: "test@example.com",
        md5sum = crypto.createHash("md5");
    md5sum.update(email);
    return md5sum.digest("hex");
};

app.get("/", loginCheck(responseRedirect("/login"), function (req, res) {
    var tasks = [];
    models.Task.findAll({
        // only get tasks that aren't finished
        where: {
            done: false
        },
        // for each task we also want to get the related subtasks
        include: [models.SubTask],
        // we want to order the tasks by id in an ascending order
        order: "`Task`.`id` ASC"
    }).then(function (doa) {
        for (var i = 0; i < doa.length; i++) {
            var task = doa[i].values,
                sts = [];
            for (var j = 0; j < task.SubTasks.length; j++) {
                var st = task.SubTasks[j].values;
                sts.push(st);
            }
            // make sure we order the subtasks by id ascending
            task.SubTasks = sts.sort(function (a, b) {
                if (a.id < b.id)
                    return -1;
                if (a.id > b.id)
                    return 1;
                return 0;
            });
            task.hasSubTasks = task.SubTasks.length > 0;
            task.hasContent = task.content.length > 0;
            tasks.push(task);
        }
        doa = undefined;
        res.render("layout", {todos: tasks, hasTodos: tasks.length > 0, emailMD5: getEmailMD5()});
        tasks = undefined;
    });
}));

var renderLogin = function(req, res) {
    var loginURL = "/login";
    try {
        loginURL = jsApi.env.user().login_url;
    } catch (e) {}
    return res.render("login", {loginURL: loginURL});
};

app.get("/login", loginCheck(function (req, res) {
    renderLogin(req, res);
}, function(req, res) {
    if (isDevMode) {
        renderLogin(req, res);
    } else {
        responseRedirect("/")(req, res);
    }
}));

// route used for reflected login or normal portal
// authentication. 
app.post("/login", loginCheck(function (req, res) {
    if ("jumpstarter-auth-token" in req.body) {
        try {
            // try to validate the client with the jumpstarter
            // integration library
            if (jsApi.validateSession(req.body["jumpstarter-auth-token"])) {
		var hour = 3600000;
		req.session.expires = new Date(Date.now() + hour);
		req.session.maxAge = hour;
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

// the following functions exist only as examples of how one could go
// about implementing a todo app. they are in no way complete or safe for
// real use. 
app.post("/task/new", loginCheck(responseStatus(404), function (req, res) {
    var title = req.body.title;
    if (title) {
        models.Task.create({
            title: title,
            content: "",
            done: false
        }).then(function (task) {
            res.status(200).send({tid: task.id});
        }, function (err) {
            res.status(500).send();
        });
    } else {
        res.status(404).send();
    }
}));

// updates a task with a description
app.post("/task/set-content", loginCheck(responseStatus(404), function(req, res) {
    var tid = req.body.tid,
        content = req.body.content;
    if (tid !== undefined && content) {
        models.Task.update({
            content: content
        }, {
            where: {id: tid}
        }).then(function() {
            res.status(200).send();
        }, function(err) {
            res.status(500).send();
        });
    }
}));

// marks the task as finished
app.post("/task/complete", loginCheck(responseStatus(404), function (req, res) {
    var tid = req.body.tid;
    if (tid !== undefined) {
        models.Task.update({
            done: true
        }, {
            where: {id: tid}
        }).then(function () {
            res.status(200).send();
        }, function (err) {
            res.status(500).send();
        });
    } else {
        res.status(404).send();
    }
}));

// renders a task item and sends the rendered page to the requester
app.post("/task/render", loginCheck(responseStatus(404), function(req, res) {
    var tid = req.body.tid;
    if (tid !== undefined) {
        models.Task.find({
            where: {id: tid},
            include: [models.SubTask]
        }).then(function(doa) {
            if (doa) {
                var task = doa.values;
                task.hasSubTasks = task.SubTasks.length > 0;
                task.hasContent = task.content.length > 0;
                res.render("todoItem", {todo: task});
            } else {
                res.status(404).send();
            }
        }, function(err) {
            res.status(500).send();
        });
    } else {
        res.status(404).send();
    }
}));

// creates a new subtask connected to given task with the given title
app.post("/subtask/new", loginCheck(responseStatus(404), function (req, res) {
    var tid = req.body.tid;
    var title = req.body.title;
    // first find the task we want to add a subtask to
    models.Task.find({
        where: {id: tid}
    }).then(function (task) {
        if (task) {
            // if found -> create a new subtask
            models.SubTask.create({
                title: title,
                done: false
            }).then(function (stask) {
                // connect the subtask to the task and reply
                // with the id of the newly created subtask
                stask.setTask(task).then(function () {
                    res.status(200).send({stid: stask.id});
                });
            });
        } else {
            // means we got an invalid task id from the user
            res.status(404).send();
        }
    });
}));

// marks a subtask as complete
app.post("/subtask/complete", loginCheck(responseStatus(404), function (req, res) {
    var stid = req.body.stid;
    models.SubTask.update({
        done: true
    }, {
        where: {id: stid}
    }).then(function () {
        res.status(200).send({stid: stid});
    }, function () {
        res.status(500).send();
    });
}));

// renders a subtask item and sends the result to the requester
app.post("/subtask/render", loginCheck(responseStatus(404), function(req, res) {
    var stid = req.body.stid;
    if (stid !== undefined) {
        models.SubTask.find({
            where: {id: stid}
        }).then(function(doa) {
            if (doa) {
                var stask = doa.values;
                res.render("todoSubTask", {stask: stask});
            } else {
                res.status(404).send();
            }
        }, function(err) {
            res.status(404).send();
        });
    } else {
        res.status(404).send();
    }
}));

module.exports = app;
