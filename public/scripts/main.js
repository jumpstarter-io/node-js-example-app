$(function () {
    $.fn.serializeObject = function () {
        var o = {};
        var a = this.serializeArray();
        $.each(a, function (idx, elem) {
            if (o[this.name]) {
                if (!o[this.name].push) {
                    o[this.name] = [o[this.name]];
                }
                o[this.name].push(this.value || "");
            } else {
                o[this.name] = this.value || "";
            }
        });
        return o;
    };
    $.fn.hasAttr = function(attribute) {
        var a = $(this).attr(attribute);
        return a !== null && a !== undefined;
    };
    
    var apiCalling = false;
    
    var api = function() {
        function api(ep) {
            if (!(this instanceof api))
                return new api(ep);
            this.ep = ep;
            return this;
        };
        api.prototype.call = function(data, cb) {
            apiCalling = true;
            $.ajax({
                url: this.ep,
                type: "POST",
                data: JSON.stringify(data),
                contentType: "application/json; charset=UTF-8",
                success: function(rsp, textStatus, jqXHR) {
                    apiCalling = false;
                    cb && cb(rsp || true);
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    apiCalling = false;
                    cb && cb(null);
                }
            });
        };
        return api;
    }();
    
    $("body").on("submit", "form", function () {
        var $frm = $(this);
        if (!$frm.hasAttr("data-api"))
            return true;
        var path = $frm.data("api"),
            data = $frm.serializeObject();
        new api(path).call(data, function(rsp) {
            $frm.trigger("apiResponse", rsp);
        });
        return false;
    });
    
    var taskComplete = function(ev, rsp) {
        if (rsp) {
            var $parent = $(this).parents("div.todo-item:first"),
                $taskDetails = $parent.find("div.task-details");
            if (!$taskDetails.is(":visible")) {
                $taskDetails.remove();
            }
            $parent.fadeOut("fast", function() {
                $parent.remove();
            });
        }
        return false;
    };
    
    $(".frm-task-complete").on("apiResponse", taskComplete);
    
    var taskContent = function(ev) {
        var $frm = $(ev.target),
            iptVal = $frm.find("input[name='content']").val(),
            $row = $frm.parents("div.row.todo-item:first"),
            $i = $row.find("i.fa-file-text-o");
        if (iptVal.length) {
            $i.show();
        } else {
            $i.hide();
        }
        return false;
    };
    
    $(".frm-task-set-content").on("apiResponse", taskContent);
    
    var taskToggleDetails = function(ev) {
        if (apiCalling) return false;
        var $parent = $(ev.target).parents("div.row.todo-item:first"),
            $details = $parent.find("div.task-details");
        $details.toggle();
        return false;
    };
    
    $("div.task").on("click", taskToggleDetails);
    
    var subtaskComplete = function(ev, rsp) {
        if (rsp) {
            new api("/subtask/render").call(rsp, function(rsp) {
                $(ev.target).parent().replaceWith($(rsp));
            });
        }
        return false;
    };
    
    $(".frm-sub-task-complete").on("apiResponse", subtaskComplete);
    
    var taskAddSubtask = function(ev, rsp) {
        var $frm = $(ev.target);
        if (rsp) {
            new api("/subtask/render").call(rsp, function(rsp) {
                if (rsp) {
                    var $st = $(rsp);
                    $st.find("form").on("apiResponse", subtaskComplete);
                    $st.insertBefore($frm);
                    $frm.find("input[name='title']").val("");
                    $frm.parents("div.row.todo-item:first").find("i.fa-paperclip").show();
                }
            });
        }
        return false;
    };
    
    $(".frm-add-sub-task").on("apiResponse", taskAddSubtask);
    
    $("div.task-details").on("click", function() {
        return false;
    });
    
    $("body").on("click", function() {
        $("div.task-details").each(function(idx, e) {
            var $elem = $(e);
            if ($elem.is(":visible")) {
                $elem.hide();
            }
        });
    });
    
    $("form[name='new-todo']").on("apiResponse", function(ev, rsp) {
        var $frm = $(ev.target);
        if (rsp) {
            new api("/task/render").call(rsp, function(rsp) {
                if (rsp) {
                    var $c = $(rsp);
                    $("div.task-list").append($c);
                    $c.find("div.task-details").show();
                    $c.find("form.frm-task-complete").on("apiResponse", taskComplete);
                    $c.find("form.frm-task-set-content").on("apiResponse", taskContent);
                    $c.find("div.task").on("click", taskToggleDetails);
                    $c.find("div.task-details").on("click", function() {
                        return false;
                    });
                    $c.find(".frm-add-sub-task").on("apiResponse", taskAddSubtask);
                    $c.find(".frm-sub-task-complete").on("apiResponse", subtaskComplete);
                    $frm.find("input[type=text], textarea").val("");
                } else {
                    console.log("did not get a rendered item left");
                }
            });
        } else {
            console.log("could not create todo");
        }
    });
});
