async function loadHtml(res, query = "") {
	const html = removeScriptAndImage(await res.text());

	$("#load" + query).html(html);
}

function removeScriptAndImage(text) {
	const regRemove = /src=(.*?)"|<script(.*?)>|<link(.*?)>|style="(.*?)"/g;
	return text.replaceAll(regRemove, "");
}

function makeURL({ host, path, query }) {
	let queryStr = formData(query);
	return `https://${host + path}${!queryStr.length ? "" : "?" + queryStr}`;
}

function getChild(data, i) {
	return data.children(`:nth-child(${i})`);
}

function formData(data) {
	const fromStr = new Array();
	for (const key in data) fromStr.push(key + "=" + data[key]);
	return fromStr.join("&");
}

function getDataLocal(keys = null) {
	return new Promise((resolve, reject) => {
		chrome.storage.local.get(keys, (data) => resolve(data));
	});
}
function setDataLocal(object) {
	chrome.storage.local.set(object);
}

function clearDataLocal() {
	chrome.storage.local.clear();
}

function delay(ms = 50) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
