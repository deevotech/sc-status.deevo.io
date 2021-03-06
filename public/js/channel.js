$(document).ready(function () {
    var c_id = null;
    var getChannelInterval = setInterval(getChannelInfo, 30000);
});

function getErrorMessage(error) {
    if (error === null || error === undefined) {
        return 'Could not get reponse!';
    }

    const messageRe = /(message:.*\)<)/;
    const headerRe = /(<h1>(.|\n)*?<\/h1>)/;

    if (messageRe.test(error)) {
        let m = error.match(messageRe);
        if (m.length > 0) {
            var temp = m[0].split(")<")[0];
            temp = temp.split("message:")[1];
            return `<strong>${temp}</strong>`;
        }
    } else if (headerRe.test(error)) {
        let m = error.match(headerRe);
        if (m.length > 0) {
            var temp = m[0].split("</h1>")[0];
            temp = temp.split("<h1>")[1];
            return `<strong>${temp}</strong>`;
        }
    }

    return error
}

function showChannelError(e) {
    let info = $('#error-channel-div');
    info.html('');
    info.append(getErrorMessage(e.responseText));
    info.show();
}

function hideChannelError() {
    let info = $('#error-channel-div');
    info.html('');
    info.hide();
}

function getChannelAndNodesInfo(channelID) {
    getPeers(channelID);
    getOrderers(channelID);
    c_id = channelID;
    getChannelInfo()
}

function getChannelInfo() {
    if (c_id === null) {
        console.log('empty channel ID');
        return;
    }
    console.log(`get channel ${c_id}`);
    $('#channel-root-container').show();
    hideChannelError();

    $.get(`/api/v1/status/channel/${c_id}`,
        {},
        function (result) {
            var info = $('#info');
            info.html("");
            info.append(`<tr>
                    <th>Block count</th>
                    <td>${result.info.count}</td>
                    </tr>`);
            info.append(`<tr>
                    <th>Total transactions count</th>
                    <td>${result.tx_count}</td>
                    </tr>`);
            info.append(`<tr>
                    <th>Today transactions count</th>
                    <td>${result.tx_count_today}</td>
                    </tr>`);
            info.append(`<tr>
                    <th>Current Block Hash</th>
                    <td>${result.info.currentBlockHash}</td>
                    </tr>`);
            info.append(`<tr>
                    <th>Previous Block Hash</th>
                    <td>${result.info.previousBlockHash}</td>
                    </tr>`);
        })
        .fail(function (e) {
            showChannelError(e);
        })
}

function getOrderers(channelID) {
    $.get(`/api/v1/status/channel/${channelID}/orderers`,
        {},
        function (result) {
            $('#orderer-root-container').show();
            var list = $('#orderer-info');
            list.html("");
            $.each(result, function (index, orderer) {
                let name = orderer.name;
                let html = `<li class="list-group-item">
                    <a><i class="fa fa-codepen" style="margin-right:8px"></i> <strong>${name}<span id="orderer-${index}"></span></strong></a><div id="orderer-status-${index}"></div>
                    </li>`;
                list.append(html);

                let org = name.split('.')[1];
                $.get(`/api/v1/status/org/${org}/channel/${channelID}/orderer/${name}`,
                    {},
                    function (stat) {
                        $(`#orderer-${index}`).text(` - ${stat.status}`);
                        let statusDot = $(`#orderer-status-${index}`);
                        statusDot.removeClass();
                        statusDot.addClass(getStatusClass(stat.status));
                        // statusDot.addClass('blink');
                    })
            })
            // $(".channel-item").on("click", function () {
            //     $("#side-menu").find(".active").removeClass("active");
            //     $(this).addClass("active");
            //     getChannelInfo(this.id);
            // });
        })
}

function getPeers(channelID) {
    $.get(`/api/v1/status/channel/${channelID}/peers`,
        {},
        function (result) {
            $('#peer-root-container').show();
            var list = $('#peer-info');
            list.html("");
            $.each(result, function (index, peer) {
                let name = peer.name;
                let html = `<li class="list-group-item">
                    <a><i class="fa fa-codepen" style="margin-right:8px"></i> <strong>${name}<span id="peer-${index}"></span></strong></a><div id="peer-status-${index}"></div>
                    </li>`;
                list.append(html);
                let org = name.split('.')[1];
                $.get(`/api/v1/status/org/${org}/channel/${channelID}/peer/${name}`,
                    {},
                    function (stat) {
                        $(`#peer-${index}`).text(` - ${stat.status}`);
                        let statusDot = $(`#peer-status-${index}`);
                        statusDot.removeClass();
                        statusDot.addClass(getStatusClass(stat.status));
                        // statusDot.addClass('blink');
                    })
            })
            // $(".channel-item").on("click", function () {
            //     $("#side-menu").find(".active").removeClass("active");
            //     $(this).addClass("active");
            //     getChannelInfo(this.id);
            // });
        })
}

function getStatusClass(status) {
    switch (status) {
        case 'RUNNING': return `running-circle`;
        case 'DOWN': return `stopped-circle`;
        default: return `starting-circle`;
    }
}
