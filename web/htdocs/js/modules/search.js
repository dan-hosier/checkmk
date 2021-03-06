// Copyright (C) 2019 tribe29 GmbH - License: GNU General Public License v2
// This file is part of Checkmk (https://checkmk.com). It is subject to the terms and
// conditions defined in the file COPYING, which is part of this source code package.

import {call_ajax} from "ajax";
import {add_class, remove_class} from "utils";

var g_call_ajax_obj = null;
var g_current_search_position = null;

class Search {
    constructor(id) {
        this.id = id;
        this.content_id = "content_inner_" + id;
        this.search_id = "content_inner_" + id + "_search";
        this.input_id = "mk_side_search_field_" + id + "_search";
        this.more_id = "more_main_menu_" + id;
        this.previous_timeout_id = null;
    }

    execute_search() {
        if (this.has_search_query()) {
            Search.kill_previous_search();
            this.display_search_results();
            const obj = document.getElementById(this.search_id);
            g_call_ajax_obj = call_ajax(
                "ajax_search_" + this.id + ".py?q=" + encodeURIComponent(this.get_current_input()),
                {
                    response_handler: Search.handle_search_response,
                    handler_data: {obj: obj},
                }
            );
        } else {
            this.display_menu_items();
        }
    }

    get_current_input() {
        return document.getElementById(this.input_id).value;
    }

    has_search_query() {
        // Search only for 2 or more characters
        return this.get_current_input().length > 1 ? true : false;
    }

    display_menu_items() {
        // Clear also the result list, as the popup resize mechanism is relying on finding only
        // ul's which corresponds to the main menu items
        document.getElementById(this.search_id).innerHTML = "";

        const more_button = document.getElementById(this.more_id);
        if (more_button) {
            remove_class(more_button, "hidden");
        }
        remove_class(document.getElementById(this.content_id), "hidden");
    }

    display_search_results() {
        g_current_search_position = null;

        // The more button has currently no function in the search results, so hide it during
        // search in case it is available.
        const more_button = document.getElementById(this.more_id);
        if (more_button) {
            add_class(more_button, "hidden");
        }
        add_class(document.getElementById(this.content_id), "hidden");
    }

    static handle_search_response(handler_data, ajax_response) {
        const response = JSON.parse(ajax_response);
        if (response.result_code !== 0) {
            // TODO: Decide what to display in case of non-zero result code
            handler_data.obj.innerHTML = "Ajax Call returned non-zero result code.";
        } else {
            handler_data.obj.innerHTML = response.result;
        }
        return;
    }

    static kill_previous_search() {
        // Terminate eventually already running request
        if (g_call_ajax_obj) {
            g_call_ajax_obj.abort();
            g_call_ajax_obj = null;
        }
    }
}

// Let all current implemented searches be singletons
const monitoring_search = new Search("monitoring");
const setup_search = new Search("setup");

export function on_input_search(id) {
    let current_search = get_current_search(id);
    if (current_search) {
        if (current_search.previous_timeout_id !== null) {
            clearTimeout(current_search.previous_timeout_id);
        }
        current_search.previous_timeout_id = setTimeout(function () {
            current_search.execute_search();
        }, 300);
    }
}

function get_current_search(id) {
    let current_search = null;

    switch (id) {
        case "monitoring":
            current_search = monitoring_search;
            break;
        case "setup":
            current_search = setup_search;
            break;
        default:
            console.log("The requested search is not implemented: " + id);
            break;
    }

    return current_search;
}
export function on_key_down(id) {
    let current_search = get_current_search(id);
    let current_key = window.event.key;

    if (!(current_key || current_search)) {
        return;
    }
    switch (current_key) {
        case "ArrowDown":
        case "ArrowUp":
            move_current_search_position(current_key == "ArrowDown" ? 1 : -1, current_search);
            window.event.preventDefault();
            break;
        case "Enter":
            click_current_search_position(current_search);
            break;
    }
}

function click_current_search_position(current_search) {
    if (g_current_search_position == null) {
        return;
    }
    document
        .getElementById(current_search.search_id)
        .getElementsByTagName("li")
        [g_current_search_position].getElementsByClassName("active")[0]
        .click();
}

function move_current_search_position(step, current_search) {
    if (g_current_search_position == null) {
        g_current_search_position = -1;
    }

    g_current_search_position += step;

    let result_list = document.getElementById(current_search.search_id).getElementsByTagName("li");
    if (!result_list) return;

    if (g_current_search_position < 0) g_current_search_position = result_list.length - 1;
    if (g_current_search_position > result_list.length - 1) g_current_search_position = 0;

    result_list.forEach((value, idx) => {
        idx == g_current_search_position
            ? add_class(value.childNodes[0], "active")
            : remove_class(value.childNodes[0], "active");
    });
}
