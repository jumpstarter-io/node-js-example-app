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
    var api = function() {
        function api(ep) {
            if (!(this instanceof api))
                return new api(ep);
            this.ep = ep;
            return this;
        };
        api.prototype.call = function(data, cb) {
            $.ajax({
                url: this.ep,
                type: "POST",
                data: JSON.stringify(data),
                contentType: "application/json; charset=UTF-8",
                success: function(rsp, textStatus, jqXHR) {
                    cb && cb(rsp || true);
                },
                error: function(jqXHR, textStatus, errorThrown) {
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
            var $parent = $(this).parents("div.todo-item:first");
            $parent.slideUp(function() {
                $parent.remove();
            });
        }
    };
    
    $(".frm-task-complete").on("apiResponse", taskComplete);
    
    var taskContent = function(ev, rsp) {
        var $frm = $(ev.target),
            iptVal = $frm.find("input[name='content']").val(),
            $row = $frm.parents("div.row.todo-item:first"),
            $i = $row.find("i.fa-file-text-o");
        if (iptVal.length) {
            $i.show();
        } else {
            $i.hide();
        }
    };
    
    $(".frm-task-set-content").on("apiResponse", taskContent);
    
    $("form[name='new-todo']").on("apiResponse", function(ev, rsp) {
        var $frm = $(ev.target);
        if (rsp) {
            new api("/task/render").call(rsp, function(rsp) {
                if (rsp) {
                    var $c = $(rsp);
                    //$c.css("display", "none");
                    $("div.task-list").append($c);
                    $c.find("form.frm-task-complete").on("apiResponse", taskComplete);
                    $c.find("form.frm-task-set-content").on("apiResponse", taskContent);
                    //$c.slideDown();
                    $frm.find("input[type=text], textarea").val("");
                } else {
                    console.log("did not get a rendered item left");
                }
            });
        } else {
            console.log("could not create todo");
        }
    });
    
    
    /*
    $("div[name='todos']").on("vistaRefreshed", function () {
        var $todosVista = $(this);
        $(this).find("input[type='checkbox'].task-complete").on("change", function () {
            var parent = $(this).parents("div:first");
            var tid = parent.data("tid");
            $.ajax({
                url: "/task/complete",
                type: "POST",
                data: {id: tid},
                success: function () {
                    parent.slideUp(function () {
                        parent.remove();
                        if ($todosVista.children().length === 0) {
                            $todosVista.trigger("vistaRefresh");
                        }
                    });
                }
            });
        });

        $("input.subtask-complete").on("change", function () {
            var stid = $(this).data("stid");
            $.ajax({
                url: "/subtask/complete",
                type: "POST",
                data: {stid: stid},
                success: function () {
                    $todosVista.trigger("vistaRefresh");
                }
            });
            return false;
        });

        $("a.add-subtask").on("click", function () {
            var $parent = $(this).parent(),
                    $ps = $parent.next(),
                    $ipt = $ps.find("input[name='title']");
            $ps.slideToggle(function () {
                $ipt.focus();
            });
        });

        $("form.add-subtask").on("submit", function () {
            $frm = $(this);
            $.ajax({
                url: "/subtask/new",
                type: "POST",
                data: $frm.serializeObject(),
                success: function () {
                    $todosVista.trigger("vistaRefresh");
                }
            });
            return false;
        });
        return false;
    });

    $("form[name='new-todo']").on("submit", function () {
        var $frm = $(this);
        $.ajax({
            url: "/task/new",
            type: "POST",
            data: $frm.serializeObject(),
            success: function (response, textStatus, jqXHR) {
                $("div[data-vista]").trigger("vistaRefresh");
                $("div.new-todo").slideUp(function () {
                    $frm.find("input[type=text], textarea").val("");
                });
            }
        });
        return false;
    });

    $("body").on("vistaRefresh", function (ev) {
        var $vista = $(ev.target);
        $.ajax({
            url: "/vista/" + $vista.attr("data-vista").replace(/^\//, ""),
            type: "GET",
            async: true,
            success: function (response, textStatus, jqXHR) {
                $vista.html(response).trigger("vistaRefreshed");
            }
        });
    });

    $("div[data-vista]").trigger("vistaRefresh");
    */
});
