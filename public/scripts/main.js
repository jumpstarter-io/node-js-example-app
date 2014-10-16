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
    $("a.newTodo").on("click", function () {
        $("body").trigger("newTodo");
        return false;
    });
    $("body").on("newTodo", function () {
        $("div.new-todo").slideToggle(function () {
            $("form input").first().focus();
        });
        return false;
    });
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
});
