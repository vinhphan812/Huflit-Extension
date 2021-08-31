const regRemove = /src=(.*?)"|<script(.*?)>|<link(.*?)>/g;

async function loadHtml(res, query = "") {
	const html = removeScriptAndImage(await res.text());

	$("#load" + query).html(html);
}

function removeScriptAndImage(text) {
	return text.replaceAll(regRemove, "");
}

function makeURL({ host, path, query }) {
	let queryStr = new Array();
	for (const key in query) queryStr.push(key + "=" + query[key]);
	return `https://${host + path}${
		!queryStr.length ? "" : "?" + queryStr.join("&")
	}`;
}

function formData(data) {
	const fromStr = new Array();
	for (const key in data) fromStr.push(key + "=" + data[key]);
	return fromStr.join("&");
}

function getDataLocal(keys = null) {
	return new Promise((resolve, reject) => {
		chrome.storage.local.get(keys, function (data) {
			resolve(data);
		});
	});
}
function setDataLocal(object) {
	chrome.storage.local.set(object);
	return "done";
}

function clearDataLocal() {
	chrome.storage.local.clear();
	return "done";
}

let data = {},
	el = $("tbody:first>tr:not(:first):not(:last)>td"),
	current = "";

el.each(function (i, e) {
	if (i % 3 == 0) return;
	if (i % 3 == 2) {
		console.log($("code", e).text());
		data[$("code", e).text()] = current;
	}
	if (i % 3 == 1) current = $(e).text();
});
